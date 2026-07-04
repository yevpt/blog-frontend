# 用户管理模块重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 blog-backend + blog-admin 的用户管理从「只能切 VIP + 假搜索 + 顶部占满头像工具」重构为生产级：真实搜索筛选、账号禁用能力、整合内容审核的用户治理、操作日志、合理的详情弹层布局。

**Architecture:** 后端只新增 1 张表（`admin_operation_log`），其余是对 `internal/service/user`、`internal/handler/user`、`internal/handler/moderation`、`internal/repository/user` 的查询/接口扩展；前端在 `apps/admin/src/modules/users/` 内重排列表页并新增详情 Modal（Tabs），把 `apps/admin/src/modules/moderation/` 里手动输入 ID 的「用户治理」Tab 迁移进来后删除。

**Tech Stack:** 后端 Go 1.x + Gin + GORM(MySQL)，测试用 `go-sqlmock` + `gomock` + `testify`；前端 React 19 + TypeScript + Vitest + Testing Library，UI 用 `@repo/ui`（`Modal`/`Tabs`/`Select`/`DataTable`），状态用 React Query/`useEffect`（沿用模块现有模式）。

## Global Constraints

- 禁 `any`；TypeScript 优先纯函数 + Early Return（AGENTS.md）。
- 改 Hook → `*.test.ts`，组件 → `*.test.tsx`，页面 → `page.test.tsx`（AGENTS.md，强制）。
- apps/admin 是纯客户端 SPA，禁止 `'use client'` 指令；环境变量用 `import.meta.env`。
- 禁裸 `fetch`（用 `@repo/api` 的 `apiClient`）；禁内联 `<svg>`（用 `@repo/icons` 的 `SvgIcon`）。
- 新增 admin 模块/路由不手写 nav 数组，不在 `App.tsx` 加 `<Route>`，统一在 `src/config/modules.ts` 的 `adminModules` 注册。
- 不做批量操作、不做通用角色编辑器（保持单管理员）、不做用户资料编辑、不做导出——见设计文档「不做的事」。
- 参考设计文档：`docs/superpowers/specs/2026-07-04-user-management-redesign-design.md`。

---

## 后端任务（blog-backend 仓库，工作目录 `/Users/vpt/Documents/Codes/blog/blog-backend`）

### Task 1: 操作日志表 + repository + service（`adminlog` 域）

**Files:**
- Create: `migrations/20260704_admin_operation_log.sql`
- Create: `internal/model/admin_operation_log.go`
- Create: `internal/repository/adminlog/adminlog.go`
- Create: `internal/repository/adminlog/adminlog_test.go`
- Create: `internal/repository/adminlog/mock/mock_adminlog_repository.go`（mockgen 生成）
- Create: `internal/service/adminlog/adminlog.go`
- Create: `internal/service/adminlog/adminlog_test.go`

**Interfaces:**
- Produces：`adminlog.Action`（string 类型常量）、`adminlog.Recorder` 接口 `Record(ctx context.Context, operatorID, targetUserID uint, action Action, detail map[string]any) error`、`adminlog.NewService(repo adminlogrepo.Repository) Recorder`、`adminlogrepo.Repository` 接口 `Create(ctx context.Context, entry *model.AdminOperationLog) error` 和 `ListByTargetUser(ctx context.Context, targetUserID uint, offset, limit int) ([]model.AdminOperationLog, int64, error)`。
- 后续 Task 5、7、8、9 都依赖这里的 `Action` 常量和 `Recorder` 接口。

- [ ] **Step 1: 写迁移 SQL**

```sql
-- migrations/20260704_admin_operation_log.sql
-- 2026-07-04: 管理员操作日志表，记录用户管理相关的管理员操作（VIP/账号禁用/审核处罚等）

CREATE TABLE `admin_operation_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `operator_id` bigint unsigned NOT NULL COMMENT '操作人（管理员）用户 ID',
  `target_user_id` bigint unsigned NOT NULL COMMENT '被操作的目标用户 ID',
  `action` varchar(32) NOT NULL COMMENT '操作类型',
  `detail` json NULL COMMENT '操作详情（理由/到期时间等）',
  `created_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_admin_operation_log_target_user` (`target_user_id`, `created_at`),
  KEY `idx_admin_operation_log_operator` (`operator_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 2: 写 model**

```go
// internal/model/admin_operation_log.go
package model

import "time"

// AdminOperationLog 管理员对用户执行管理操作的审计记录。
type AdminOperationLog struct {
	ID           uint64    `gorm:"primarykey" json:"id"`
	OperatorID   uint      `gorm:"not null;index:idx_admin_operation_log_operator,priority:1" json:"operator_id"`
	TargetUserID uint      `gorm:"not null;index:idx_admin_operation_log_target_user,priority:1" json:"target_user_id"`
	Action       string    `gorm:"size:32;not null" json:"action"`
	Detail       *string   `gorm:"type:json" json:"detail,omitempty"`
	CreatedAt    time.Time `gorm:"type:datetime(3);not null" json:"created_at"`
}

func (AdminOperationLog) TableName() string { return "admin_operation_log" }
```

- [ ] **Step 3: 写 repository 接口 + 实现的失败测试**

```go
// internal/repository/adminlog/adminlog_test.go
package adminlog_test

import (
	"context"
	"database/sql"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/vpt/blog-backend/internal/model"
	adminlog "github.com/vpt/blog-backend/internal/repository/adminlog"
)

func newMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock, *sql.DB) {
	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	gormDB, err := gorm.Open(mysql.New(mysql.Config{
		Conn:                      sqlDB,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)
	return gormDB, mock, sqlDB
}

func TestRepository_Create(t *testing.T) {
	db, mock, sqlDB := newMockDB(t)
	defer sqlDB.Close()
	repo := adminlog.NewRepository(db)

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `admin_operation_log`").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.Create(context.Background(), &model.AdminOperationLog{
		OperatorID: 1, TargetUserID: 7, Action: "grant_vip",
	})
	require.NoError(t, err)
}

func TestRepository_ListByTargetUser(t *testing.T) {
	db, mock, sqlDB := newMockDB(t)
	defer sqlDB.Close()
	repo := adminlog.NewRepository(db)

	mock.ExpectQuery("SELECT count").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
	mock.ExpectQuery("SELECT \\* FROM `admin_operation_log`").
		WithArgs(uint(7)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "operator_id", "target_user_id", "action", "detail", "created_at",
		}).AddRow(1, 1, 7, "grant_vip", nil, nil))

	items, total, err := repo.ListByTargetUser(context.Background(), 7, 0, 10)
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, items, 1)
}
```

- [ ] **Step 4: 跑测试确认失败**

Run: `go test ./internal/repository/adminlog/...`
Expected: FAIL（`adminlog` 包和 `NewRepository` 未定义）

- [ ] **Step 5: 实现 repository**

```go
// internal/repository/adminlog/adminlog.go
package adminlog

import (
	"context"

	"gorm.io/gorm"

	"github.com/vpt/blog-backend/internal/model"
)

// Repository 管理员操作日志的持久化接口。
type Repository interface {
	Create(ctx context.Context, entry *model.AdminOperationLog) error
	ListByTargetUser(ctx context.Context, targetUserID uint, offset, limit int) ([]model.AdminOperationLog, int64, error)
}

type repo struct {
	db *gorm.DB
}

// NewRepository 创建管理员操作日志仓储。
func NewRepository(db *gorm.DB) Repository {
	return &repo{db: db}
}

func (r *repo) Create(ctx context.Context, entry *model.AdminOperationLog) error {
	return r.db.WithContext(ctx).Create(entry).Error
}

func (r *repo) ListByTargetUser(ctx context.Context, targetUserID uint, offset, limit int) ([]model.AdminOperationLog, int64, error) {
	var total int64
	query := r.db.WithContext(ctx).Model(&model.AdminOperationLog{}).Where("target_user_id = ?", targetUserID)
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []model.AdminOperationLog
	err := query.Order("created_at DESC, id DESC").Offset(offset).Limit(limit).Find(&items).Error
	return items, total, err
}
```

- [ ] **Step 6: 跑测试确认通过**

Run: `go test ./internal/repository/adminlog/...`
Expected: PASS

- [ ] **Step 7: 生成 mock**

Run:
```bash
mockgen -destination=internal/repository/adminlog/mock/mock_adminlog_repository.go -package=mock github.com/vpt/blog-backend/internal/repository/adminlog Repository
```

- [ ] **Step 8: 写 service 的失败测试**

```go
// internal/service/adminlog/adminlog_test.go
package adminlog_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/vpt/blog-backend/internal/model"
	repomock "github.com/vpt/blog-backend/internal/repository/adminlog/mock"
	adminlog "github.com/vpt/blog-backend/internal/service/adminlog"
)

func TestService_Record_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := repomock.NewMockRepository(ctrl)

	repo.EXPECT().Create(gomock.Any(), gomock.Any()).DoAndReturn(
		func(_ context.Context, entry *model.AdminOperationLog) error {
			assert.Equal(t, uint(1), entry.OperatorID)
			assert.Equal(t, uint(7), entry.TargetUserID)
			assert.Equal(t, string(adminlog.ActionGrantVIP), entry.Action)
			require.NotNil(t, entry.Detail)
			return nil
		},
	)

	svc := adminlog.NewService(repo)
	err := svc.Record(context.Background(), 1, 7, adminlog.ActionGrantVIP, map[string]any{"note": "test"})
	require.NoError(t, err)
}

func TestService_Record_NilDetail(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := repomock.NewMockRepository(ctrl)

	repo.EXPECT().Create(gomock.Any(), gomock.Any()).DoAndReturn(
		func(_ context.Context, entry *model.AdminOperationLog) error {
			assert.Nil(t, entry.Detail)
			return nil
		},
	)

	svc := adminlog.NewService(repo)
	err := svc.Record(context.Background(), 1, 7, adminlog.ActionDisableAccount, nil)
	require.NoError(t, err)
}
```

- [ ] **Step 9: 跑测试确认失败**

Run: `go test ./internal/service/adminlog/...`
Expected: FAIL（包未定义）

- [ ] **Step 10: 实现 service**

```go
// internal/service/adminlog/adminlog.go
package adminlog

import (
	"context"
	"encoding/json"
	"time"

	"github.com/vpt/blog-backend/internal/model"
	adminlogrepo "github.com/vpt/blog-backend/internal/repository/adminlog"
)

// Action 是操作日志的操作类型枚举。
type Action string

const (
	ActionGrantVIP        Action = "grant_vip"
	ActionRevokeVIP       Action = "revoke_vip"
	ActionDisableAccount  Action = "disable_account"
	ActionEnableAccount   Action = "enable_account"
	ActionMute            Action = "mute"
	ActionBan             Action = "ban"
	ActionRelease         Action = "release"
	ActionUpdateTrustLevel Action = "update_trust_level"
	ActionClearAvatar     Action = "clear_avatar"
)

// Recorder 供各业务 handler 记录一条管理员操作日志。
type Recorder interface {
	Record(ctx context.Context, operatorID, targetUserID uint, action Action, detail map[string]any) error
}

type service struct {
	repo adminlogrepo.Repository
}

// NewService 创建操作日志记录服务。
func NewService(repo adminlogrepo.Repository) Recorder {
	return &service{repo: repo}
}

func (s *service) Record(ctx context.Context, operatorID, targetUserID uint, action Action, detail map[string]any) error {
	entry := &model.AdminOperationLog{
		OperatorID:   operatorID,
		TargetUserID: targetUserID,
		Action:       string(action),
		CreatedAt:    time.Now(),
	}
	if len(detail) > 0 {
		raw, err := json.Marshal(detail)
		if err != nil {
			return err
		}
		text := string(raw)
		entry.Detail = &text
	}
	return s.repo.Create(ctx, entry)
}
```

- [ ] **Step 11: 跑测试确认通过**

Run: `go test ./internal/service/adminlog/...`
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add migrations/20260704_admin_operation_log.sql internal/model/admin_operation_log.go internal/repository/adminlog internal/service/adminlog
git commit -m "feat(user): 新增管理员操作日志表与记录服务"
```

---

### Task 2: 账号禁用/启用能力（repository + service 校验规则）

**Files:**
- Modify: `internal/repository/user/user.go`（`UserRepository` 接口新增 `SetStatus`、`CountByRole`）
- Modify: `internal/repository/user/mock/mock_user_repository.go`（mockgen 重新生成）
- Modify: `internal/service/user/admin.go`（`AdminService` 新增 `DisableAccount`/`EnableAccount`）
- Create: `internal/service/user/admin_status_test.go`
- Modify: `pkg/roles/roles.go`（无需改，仅引用 `AdminRole` 常量）

**Interfaces:**
- Consumes：Task 1 的 `adminlog.Recorder`（不在本任务注入，留给 Task 7 统一接线，本任务只做纯业务逻辑）。
- Produces：`AdminService.DisableAccount(operatorID, targetUserID uint) error`、`AdminService.EnableAccount(targetUserID uint) error`；错误 `user.ErrCannotDisableSelf`、`user.ErrLastAdminAccount`。

- [ ] **Step 1: 在 UserRepository 接口新增方法**

在 `internal/repository/user/user.go` 的 `UserRepository` 接口（第 99-156 行）里，`GrantVipRole`/`RevokeVipRole` 之后追加：

```go
	// SetStatus 更新用户账号状态（1=正常，0=已禁用）。
	SetStatus(userID uint, status uint8) error
	// CountByRole 统计持有指定角色名称的用户数量，用于禁用前的"最后一个管理员"校验。
	CountByRole(roleName string) (int64, error)
```

并在文件末尾（紧跟 `RevokeVipRole` 实现之后）实现：

```go
func (r *userRepo) SetStatus(userID uint, status uint8) error {
	return r.db.Model(&model.User{}).Where("id = ?", userID).Update("status", status).Error
}

func (r *userRepo) CountByRole(roleName string) (int64, error) {
	var count int64
	err := r.db.Model(&model.UserRole{}).
		Joins("JOIN role ON role.id = user_role.role_id").
		Where("role.name = ?", roleName).
		Count(&count).Error
	return count, err
}
```

- [ ] **Step 2: 重新生成 mock**

Run:
```bash
mockgen -destination=internal/repository/user/mock/mock_user_repository.go -package=mock github.com/vpt/blog-backend/internal/repository/user UserRepository
```

- [ ] **Step 3: 写 service 失败测试**

```go
// internal/service/user/admin_status_test.go
package user_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/vpt/blog-backend/internal/model"
	"github.com/vpt/blog-backend/internal/repository/user/mock"
	user "github.com/vpt/blog-backend/internal/service/user"
	"github.com/vpt/blog-backend/pkg/roles"
)

func TestAdminService_DisableAccount_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := mock.NewMockUserRepository(ctrl)
	cache := &stubUserCacheService{}

	repo.EXPECT().FindByID(uint(7)).Return(&model.User{Base: model.Base{ID: 7}}, nil)
	repo.EXPECT().FindRolesByUserID(uint(7)).Return([]string{roles.NormalRole}, nil)
	repo.EXPECT().SetStatus(uint(7), uint8(0)).Return(nil)

	svc := user.NewAdminService(repo, cache)
	err := svc.DisableAccount(1, 7)
	require.NoError(t, err)
}

func TestAdminService_DisableAccount_RejectsSelf(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := mock.NewMockUserRepository(ctrl)

	svc := user.NewAdminService(repo, &stubUserCacheService{})
	err := svc.DisableAccount(7, 7)
	assert.ErrorIs(t, err, user.ErrCannotDisableSelf)
}

func TestAdminService_DisableAccount_RejectsLastAdmin(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := mock.NewMockUserRepository(ctrl)

	repo.EXPECT().FindByID(uint(9)).Return(&model.User{Base: model.Base{ID: 9}}, nil)
	repo.EXPECT().FindRolesByUserID(uint(9)).Return([]string{roles.AdminRole}, nil)
	repo.EXPECT().CountByRole(roles.AdminRole).Return(int64(1), nil)

	svc := user.NewAdminService(repo, &stubUserCacheService{})
	err := svc.DisableAccount(1, 9)
	assert.ErrorIs(t, err, user.ErrLastAdminAccount)
}

func TestAdminService_EnableAccount_Success(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := mock.NewMockUserRepository(ctrl)

	repo.EXPECT().FindByID(uint(7)).Return(&model.User{Base: model.Base{ID: 7}}, nil)
	repo.EXPECT().SetStatus(uint(7), uint8(1)).Return(nil)

	svc := user.NewAdminService(repo, &stubUserCacheService{})
	err := svc.EnableAccount(7)
	require.NoError(t, err)
}
```

- [ ] **Step 4: 跑测试确认失败**

Run: `go test ./internal/service/user/... -run TestAdminService_DisableAccount`
Expected: FAIL（`DisableAccount`/`ErrCannotDisableSelf`/`ErrLastAdminAccount` 未定义）

- [ ] **Step 5: 在 `internal/service/user/admin.go` 实现**

在文件顶部 `import` 后追加错误变量，在 `AdminService` 接口追加方法，在 `adminService` 追加实现：

```go
import (
	"context"
	"errors"

	"github.com/vpt/blog-backend/internal/dto"
	userrepo "github.com/vpt/blog-backend/internal/repository/user"
	"github.com/vpt/blog-backend/pkg/roles"
	"github.com/vpt/blog-backend/pkg/storage"
)

// ErrCannotDisableSelf 表示管理员试图禁用自己的账号。
var ErrCannotDisableSelf = errors.New("不能禁用自己的账号")

// ErrLastAdminAccount 表示目标账号是系统里最后一个管理员，禁止禁用。
var ErrLastAdminAccount = errors.New("不能禁用系统里最后一个管理员账号")

// AdminService 管理端用户用例。
type AdminService interface {
	GrantVip(targetUserID uint) (*dto.AdminUserRolesResp, error)
	RevokeVip(targetUserID uint) (*dto.AdminUserRolesResp, error)
	NormalizeAvatars(ctx context.Context, req *dto.NormalizeAvatarsReq) (*dto.NormalizeAvatarsResp, error)
	ClearUserAvatar(ctx context.Context, userID uint) (*dto.ClearUserAvatarResp, error)
	DisableAccount(operatorID, targetUserID uint) error
	EnableAccount(targetUserID uint) error
}
```

```go
func (s *adminService) DisableAccount(operatorID, targetUserID uint) error {
	if operatorID == targetUserID {
		return ErrCannotDisableSelf
	}
	user, err := s.repo.FindByID(targetUserID)
	if err != nil {
		return err
	}
	if user == nil {
		return ErrUserNotFound
	}
	userRoles, err := s.repo.FindRolesByUserID(targetUserID)
	if err != nil {
		return err
	}
	for _, r := range userRoles {
		if r == roles.AdminRole {
			count, err := s.repo.CountByRole(roles.AdminRole)
			if err != nil {
				return err
			}
			if count <= 1 {
				return ErrLastAdminAccount
			}
			break
		}
	}
	if err := s.repo.SetStatus(targetUserID, 0); err != nil {
		return err
	}
	_ = s.cache.Invalidate(context.Background(), int64(targetUserID))
	return nil
}

func (s *adminService) EnableAccount(targetUserID uint) error {
	user, err := s.repo.FindByID(targetUserID)
	if err != nil {
		return err
	}
	if user == nil {
		return ErrUserNotFound
	}
	if err := s.repo.SetStatus(targetUserID, 1); err != nil {
		return err
	}
	_ = s.cache.Invalidate(context.Background(), int64(targetUserID))
	return nil
}
```

- [ ] **Step 6: 跑测试确认通过**

Run: `go test ./internal/service/user/...`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add internal/repository/user/user.go internal/repository/user/mock/mock_user_repository.go internal/service/user/admin.go internal/service/user/admin_status_test.go
git commit -m "feat(user): 新增账号禁用/启用能力，禁止禁用自己或最后一个管理员"
```

---

### Task 3: 账号禁用/启用的 HTTP 接口

**Files:**
- Modify: `internal/handler/user/admin.go`（新增 `DisableAccount`/`EnableAccount` handler）
- Create: `internal/handler/user/admin_status_test.go`
- Modify: `internal/router/router.go`（注册 `POST /admin/users/:id/disable`、`POST /admin/users/:id/enable`）

**Interfaces:**
- Consumes：Task 2 的 `userservice.AdminService.DisableAccount/EnableAccount`、`userservice.ErrCannotDisableSelf`、`userservice.ErrLastAdminAccount`。
- Produces：两个新路由，供 Task 10 的前端 `apiClient.users.disableAccount/enableAccount` 调用。

- [ ] **Step 1: 写 handler 失败测试**

```go
// internal/handler/user/admin_status_test.go
package user_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	userhandler "github.com/vpt/blog-backend/internal/handler/user"
	userservice "github.com/vpt/blog-backend/internal/service/user"
)

func TestUserAdminHandler_DisableAccount_Forbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := &adminServiceStub{disableErr: userservice.ErrLastAdminAccount}
	h := userhandler.NewUserAdminHandler(svc, zapNop())

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{{Key: "id", Value: "9"}}
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/users/9/disable", nil)

	h.DisableAccount(c)
	require.Equal(t, http.StatusOK, w.Code) // 统一响应包在 200 里，用 code 字段区分业务失败
	assert.Contains(t, w.Body.String(), "最后一个管理员")
}
```

注：`adminServiceStub`、`zapNop()` 是本包既有的测试辅助（`user_test.go`/`admin_test.go` 已有同名 stub，若不存在则在本文件补一个最小 stub，实现 `userservice.AdminService` 全部方法，未用到的方法直接 `panic("not used")`）。

- [ ] **Step 2: 跑测试确认失败**

Run: `go test ./internal/handler/user/... -run TestUserAdminHandler_DisableAccount`
Expected: FAIL（`DisableAccount` handler 未定义）

- [ ] **Step 3: 实现 handler**

在 `internal/handler/user/admin.go` 的 `ClearUserAvatar` 之后追加：

```go
// DisableAccount 禁用目标用户账号登录。
// @Summary 禁用用户账号
// @Description 管理员禁用目标账号登录；不能禁用自己，不能禁用系统里最后一个管理员。
// @Tags 用户管理
// @Produce json
// @Param id path int true "目标用户 ID"
// @Success 200 {object} response.Response "成功；code != 0 表示业务失败（如最后一个管理员）"
// @Failure 401 {object} response.Response "未登录或 token 已过期"
// @Failure 403 {object} response.Response "需要管理员权限"
// @Failure 404 {object} response.Response "目标用户不存在"
// @Router /admin/users/{id}/disable [post]
func (h *UserAdminHandler) DisableAccount(c *gin.Context) {
	targetUserID, ok := reqbind.PathUint(c, "id", "用户 ID")
	if !ok {
		return
	}
	operator := middleware.GetUserDetail(c)
	if operator == nil {
		response.Unauthorized(c)
		return
	}
	err := h.svc.DisableAccount(operator.ID, targetUserID)
	if err != nil {
		switch {
		case errors.Is(err, userservice.ErrUserNotFound):
			response.NotFound(c)
		case errors.Is(err, userservice.ErrCannotDisableSelf), errors.Is(err, userservice.ErrLastAdminAccount):
			response.Fail(c, response.CodeBadRequest, err.Error())
		default:
			response.ServerError(c)
		}
		return
	}
	response.Success(c, nil)
}

// EnableAccount 启用目标用户账号登录。
// @Summary 启用用户账号
// @Tags 用户管理
// @Produce json
// @Param id path int true "目标用户 ID"
// @Success 200 {object} response.Response "成功"
// @Failure 401 {object} response.Response "未登录或 token 已过期"
// @Failure 403 {object} response.Response "需要管理员权限"
// @Failure 404 {object} response.Response "目标用户不存在"
// @Router /admin/users/{id}/enable [post]
func (h *UserAdminHandler) EnableAccount(c *gin.Context) {
	targetUserID, ok := reqbind.PathUint(c, "id", "用户 ID")
	if !ok {
		return
	}
	err := h.svc.EnableAccount(targetUserID)
	writeUserAdminResponse(c, nil, err)
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `go test ./internal/handler/user/...`
Expected: PASS

- [ ] **Step 5: 注册路由**

在 `internal/router/router.go` 第 641 行（`admin.POST("/users/:id/avatar/clear", ...)`）之后追加：

```go
	admin.POST("/users/:id/disable", handlers.userAdmin.DisableAccount)
	admin.POST("/users/:id/enable", handlers.userAdmin.EnableAccount)
```

- [ ] **Step 6: 编译确认**

Run: `go build ./...`
Expected: 无报错

- [ ] **Step 7: Commit**

```bash
git add internal/handler/user/admin.go internal/handler/user/admin_status_test.go internal/router/router.go
git commit -m "feat(user): 暴露账号禁用/启用管理端接口"
```

---

### Task 4: 管理端用户列表——关键词/角色/状态筛选

**Files:**
- Modify: `internal/dto/user.go`（新增 `AdminUserListReq`、`AdminUserListItemResp`、`AdminUserPageResp`）
- Modify: `internal/repository/user/user.go`（`ListAll` 签名改为接受筛选条件）
- Modify: `internal/repository/user/user_test.go`（覆盖新筛选行为）
- Modify: `internal/repository/user/mock/mock_user_repository.go`（重新生成）
- Modify: `internal/service/user/user.go`（`ListAll` 改为管理端筛选查询；公开的 `ListRecent`/旧行为保持不变）
- Modify: `internal/service/user/user_test.go`
- Modify: `internal/handler/user/user.go`（`ListAll` 沿用公开列表不变；管理端改走 Task 5 的新 handler）

> 说明：`GET /users`（公开）继续用现有 `ListRecent`/`ListAll` 语义不变；本任务把 `UserRepository.ListAll` 改造成管理端专用的可筛选查询，`internal/handler/user/user.go` 的 `ListAll`（公开路由 `GET /users`）改为调用不带筛选条件的默认参数，行为保持向后兼容。

**Interfaces:**
- Produces：`userrepo.UserListFilter{Keyword string; Role string; Status *uint8}`、`UserRepository.ListAll(filter UserListFilter, offset, limit int) ([]model.User, int64, error)`（原双参数签名改为三参数）；`dto.AdminUserListReq{Page, PageSize int; Keyword, Role, Status string}`、`dto.AdminUserListItemResp`（比 `UserListItemResp` 多 `Email`、`Status`、`SanctionState` 字段）、`dto.AdminUserPageResp`。
- Task 5 的 handler/router 消费 `dto.AdminUserListReq`/`AdminUserPageResp`。

- [ ] **Step 1: 扩展 dto**

在 `internal/dto/user.go` 的 `UserPageResp`（第 176-183 行）之后追加：

```go
// AdminUserListReq 管理端用户列表查询参数。
type AdminUserListReq struct {
	Page     int    `form:"page" binding:"omitempty,min=1" example:"1"`
	PageSize int    `form:"page_size" binding:"omitempty,min=1,max=50" example:"10"`
	Keyword  string `form:"keyword" binding:"omitempty,max=100"`
	Role     string `form:"role" binding:"omitempty,oneof=ROLE_ADMIN ROLE_VIP ROLE_NORMAL"`
	Status   string `form:"status" binding:"omitempty,oneof=active disabled"`
}

// AdminUserListItemResp 管理端用户列表项，比公开列表多带邮箱/账号状态/处罚状态。
type AdminUserListItemResp struct {
	ID            uint       `json:"id" example:"1"`
	Username      string     `json:"username" example:"vpt"`
	Nickname      *string    `json:"nickname,omitempty" example:"Yevpt"`
	Email         *string    `json:"email,omitempty" example:"vpt@example.com"`
	AvatarUrl     *string    `json:"avatar_url,omitempty"`
	Mark          *string    `json:"mark,omitempty"`
	Roles         []string   `json:"roles"`
	Status        uint8      `json:"status" example:"1"`
	SanctionState string     `json:"sanction_state" example:"active"`
	LastLoginAt   *time.Time `json:"last_login_at,omitempty"`
	LastActiveAt  *time.Time `json:"last_active_at,omitempty"`
	IsOnline      bool       `json:"is_online"`
	CreatedAt     time.Time  `json:"created_at"`
}

// AdminUserPageResp 管理端用户分页响应。
type AdminUserPageResp struct {
	Total    int64                   `json:"total" example:"100"`
	Pages    int                     `json:"pages" example:"10"`
	Page     int                     `json:"page" example:"1"`
	PageSize int                     `json:"page_size" example:"10"`
	List     []AdminUserListItemResp `json:"list"`
}
```

- [ ] **Step 2: 写 repository 筛选查询的失败测试**

在 `internal/repository/user/user_test.go` 追加：

```go
func TestUserRepository_ListAll_WithKeywordRoleStatus(t *testing.T) {
	db, mock, sqlDB := newMockDB(t)
	defer sqlDB.Close()
	repo := user.NewUserRepository(db)

	mock.ExpectQuery("SELECT count").WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
	mock.ExpectQuery("SELECT DISTINCT user\\.\\*").
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "created_at", "updated_at", "deleted_at",
			"username", "password", "password_set", "nickname", "email", "phone",
			"site", "avatar_url", "mark", "status", "last_login_at",
		}).AddRow(1, nil, nil, nil, "vpt", "hashed", true, "Yevpt", "vpt@example.com", nil, nil, nil, "博主", 1, nil))

	status := uint8(1)
	users, total, err := repo.ListAll(user.UserListFilter{Keyword: "vpt", Role: "ROLE_ADMIN", Status: &status}, 0, 10)
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, users, 1)
}
```

- [ ] **Step 3: 跑测试确认失败**

Run: `go test ./internal/repository/user/... -run TestUserRepository_ListAll_WithKeywordRoleStatus`
Expected: FAIL（`UserListFilter` 未定义、`ListAll` 签名不匹配）

- [ ] **Step 4: 改造 repository**

在 `internal/repository/user/user.go` 的 `UserRepository` 接口里把：

```go
	// ListAll 获取所有用户列表，按角色排序后按 last_active_at 降序
	ListAll(offset, limit int) ([]model.User, int64, error)
```

改为：

```go
	// ListAll 管理端筛选查询：关键词匹配 username/nickname/email，role/status 可选精确过滤；按角色权重+活跃时间排序
	ListAll(filter UserListFilter, offset, limit int) ([]model.User, int64, error)
```

在接口上方新增：

```go
// UserListFilter 管理端用户列表的筛选条件；零值表示不过滤该维度。
type UserListFilter struct {
	Keyword string
	Role    string
	Status  *uint8
}
```

把 `ListAll` 实现（第 358-385 行）替换为：

```go
func (r *userRepo) ListAll(filter UserListFilter, offset, limit int) ([]model.User, int64, error) {
	var users []model.User
	var total int64

	base := r.db.Table("user").
		Joins("LEFT JOIN user_role ON user_role.user_id = user.id").
		Joins("LEFT JOIN role ON role.id = user_role.role_id")

	if filter.Status != nil {
		base = base.Where("user.status = ?", *filter.Status)
	}
	if filter.Keyword != "" {
		like := "%" + filter.Keyword + "%"
		base = base.Where("user.username LIKE ? OR user.nickname LIKE ? OR user.email LIKE ?", like, like, like)
	}
	if filter.Role != "" {
		base = base.Where("role.name = ?", filter.Role)
	}

	countQuery := base.Session(&gorm.Session{})
	if err := countQuery.Distinct("user.id").Count(&total).Error; err != nil {
		return nil, 0, err
	}

	roleWeightExpr := listUserRoleWeightExpr()
	err := base.
		Select("DISTINCT user.*").
		Group("user.id").
		Order(roleWeightExpr + " ASC, COALESCE(user.last_active_at, user.created_at) DESC, user.id DESC").
		Offset(offset).
		Limit(limit).
		Find(&users).Error

	return users, total, err
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `go test ./internal/repository/user/...`
Expected: PASS（如有其它调用 `ListAll(offset, limit)` 的旧测试，同步改成 `ListAll(user.UserListFilter{}, offset, limit)`）

- [ ] **Step 6: 重新生成 mock**

Run:
```bash
mockgen -destination=internal/repository/user/mock/mock_user_repository.go -package=mock github.com/vpt/blog-backend/internal/repository/user UserRepository
```

- [ ] **Step 7: 修正 service 层调用点**

`internal/service/user/user.go` 的 `ListAll`（第 108-120 行左右）当前调用 `s.repo.ListAll(offset, pageSize)`——这是公开路由 `GET /users` 用的，改为传空筛选保持行为不变：

```go
	users, total, err := s.repo.ListAll(userrepo.UserListFilter{}, offset, pageSize)
```

需要在文件顶部 `import` 里确认 `userrepo "github.com/vpt/blog-backend/internal/repository/user"` 已存在（已存在，见文件头）。

- [ ] **Step 8: 跑全部相关测试**

Run: `go test ./internal/service/user/... ./internal/repository/user/... ./internal/handler/user/...`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add internal/dto/user.go internal/repository/user/user.go internal/repository/user/user_test.go internal/repository/user/mock/mock_user_repository.go internal/service/user/user.go
git commit -m "feat(user): repository ListAll 支持关键词/角色/状态筛选，新增管理端列表 DTO"
```

---

### Task 5: 管理端用户列表 + 详情接口（handler/router）

**Files:**
- Modify: `internal/service/user/admin.go`（`AdminService` 新增 `ListAdmin`、`GetAdminDetail`）
- Modify: `internal/dto/user.go`（新增 `AdminUserDetailResp`）
- Create: `internal/service/user/admin_list_test.go`
- Modify: `internal/handler/user/admin.go`（新增 `ListAdmin`、`GetDetail` handler）
- Create: `internal/handler/user/admin_list_test.go`
- Modify: `internal/router/router.go`（注册 `GET /admin/users`、`GET /admin/users/:id`）

**Interfaces:**
- Consumes：Task 4 的 `userrepo.UserListFilter`、`dto.AdminUserListReq/AdminUserPageResp`；`internal/repository/moderation`（读取 `user_moderation_profile.sanction_state`，若无现成的按 userID 查询方法则在本任务的 `UserModerationProfileReader` 里新增一个最小接口，仅查询该用户的 `sanction_state`）。
- Produces：`AdminService.ListAdmin(req *dto.AdminUserListReq) (*dto.AdminUserPageResp, error)`、`AdminService.GetAdminDetail(userID uint) (*dto.AdminUserDetailResp, error)`；供 Task 10 前端 `listAdmin`/`getAdminDetail` 调用。

- [ ] **Step 1: 扩展 dto.AdminUserDetailResp**

```go
// AdminUserDetailResp 管理端用户详情，含真实邮箱/手机号（不脱敏）与审核画像摘要。
type AdminUserDetailResp struct {
	ID            uint       `json:"id"`
	Username      string     `json:"username"`
	Nickname      *string    `json:"nickname,omitempty"`
	Email         *string    `json:"email,omitempty"`
	EmailVerified bool       `json:"email_verified"`
	Phone         *string    `json:"phone,omitempty"`
	Site          *string    `json:"site,omitempty"`
	AvatarUrl     *string    `json:"avatar_url,omitempty"`
	Mark          *string    `json:"mark,omitempty"`
	Status        uint8      `json:"status"`
	PasswordSet   bool       `json:"password_set"`
	Roles         []string   `json:"roles"`
	RegisterAt    time.Time  `json:"register_at"`
	LastLoginAt   *time.Time `json:"last_login_at,omitempty"`
	LastActiveAt  *time.Time `json:"last_active_at,omitempty"`
	IsOnline      bool       `json:"is_online"`
	SanctionState string     `json:"sanction_state"`
	LikesCount    int64      `json:"likes_count"`
	MomentsCount  int64      `json:"moments_count"`
}
```

- [ ] **Step 2: 定义最小的审核画像读取依赖**

在 `internal/service/user/admin.go` 顶部新增一个小接口（避免直接依赖整个 moderation service）：

```go
// ModerationProfileReader 只读取用户的处罚状态，供用户列表/详情展示，避免反向依赖完整审核服务。
type ModerationProfileReader interface {
	GetSanctionState(userID uint) (string, error)
}
```

`adminService` struct 增加字段 `moderation ModerationProfileReader`，`NewAdminService` 增加可选依赖（沿用现有 `AdminDeps` 可变参数模式）：在 `AdminDeps` struct（同文件或 `internal/service/user` 包内查找，若不存在于本文件则在 `internal/service/user/deps.go` 找到后追加字段）里新增 `Moderation ModerationProfileReader` 字段，`NewAdminService` 里 `svc.moderation = deps[0].Moderation`。

> 实现方需先 `grep -n "type AdminDeps struct" internal/service/user/*.go` 找到 `AdminDeps` 定义文件再改，不要新建重复的 struct。

在 `internal/repository/moderation` 里补一个最小方法（若 `ModerationRepository`/等价接口已有按 userID 查询画像的方法，直接复用其返回值取 `SanctionState` 字段即可，不需要新增方法）。

- [ ] **Step 3: 写 service 失败测试**

```go
// internal/service/user/admin_list_test.go
package user_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/vpt/blog-backend/internal/dto"
	"github.com/vpt/blog-backend/internal/model"
	"github.com/vpt/blog-backend/internal/repository/user"
	"github.com/vpt/blog-backend/internal/repository/user/mock"
	userservice "github.com/vpt/blog-backend/internal/service/user"
)

type stubModerationReader struct{ state string }

func (s *stubModerationReader) GetSanctionState(uint) (string, error) { return s.state, nil }

func TestAdminService_ListAdmin_PassesFilter(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := mock.NewMockUserRepository(ctrl)

	repo.EXPECT().
		ListAll(user.UserListFilter{Keyword: "vpt", Role: "ROLE_ADMIN"}, 0, 10).
		Return([]model.User{{Base: model.Base{ID: 1}, Username: "vpt"}}, int64(1), nil)
	repo.EXPECT().FindRolesByUserIDs([]uint{1}).Return(map[uint][]string{1: {"ROLE_ADMIN"}}, nil)

	svc := userservice.NewAdminService(repo, &stubUserCacheService{}, userservice.AdminDeps{
		Moderation: &stubModerationReader{state: "active"},
	})
	resp, err := svc.ListAdmin(&dto.AdminUserListReq{Page: 1, PageSize: 10, Keyword: "vpt", Role: "ROLE_ADMIN"})
	require.NoError(t, err)
	assert.Equal(t, int64(1), resp.Total)
	assert.Equal(t, "active", resp.List[0].SanctionState)
}

func TestAdminService_GetAdminDetail_NotFound(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := mock.NewMockUserRepository(ctrl)
	repo.EXPECT().FindDetailByID(uint(9)).Return(nil, nil)

	svc := userservice.NewAdminService(repo, &stubUserCacheService{})
	resp, err := svc.GetAdminDetail(9)
	assert.Nil(t, resp)
	assert.ErrorIs(t, err, userservice.ErrUserNotFound)
}
```

- [ ] **Step 4: 跑测试确认失败**

Run: `go test ./internal/service/user/... -run "TestAdminService_ListAdmin|TestAdminService_GetAdminDetail"`
Expected: FAIL

- [ ] **Step 5: 实现 `ListAdmin`/`GetAdminDetail`**

```go
func (s *adminService) ListAdmin(req *dto.AdminUserListReq) (*dto.AdminUserPageResp, error) {
	page := req.Page
	if page < 1 {
		page = 1
	}
	pageSize := req.PageSize
	if pageSize < 1 || pageSize > 50 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	filter := userrepo.UserListFilter{Keyword: req.Keyword, Role: req.Role}
	if req.Status == "active" {
		status := uint8(1)
		filter.Status = &status
	} else if req.Status == "disabled" {
		status := uint8(0)
		filter.Status = &status
	}

	users, total, err := s.repo.ListAll(filter, offset, pageSize)
	if err != nil {
		return nil, err
	}

	ids := make([]uint, 0, len(users))
	for _, u := range users {
		ids = append(ids, u.ID)
	}
	rolesByUser, err := s.repo.FindRolesByUserIDs(ids)
	if err != nil {
		return nil, err
	}

	list := make([]dto.AdminUserListItemResp, 0, len(users))
	for _, u := range users {
		sanctionState := "active"
		if s.moderation != nil {
			if state, err := s.moderation.GetSanctionState(u.ID); err == nil && state != "" {
				sanctionState = state
			}
		}
		list = append(list, dto.AdminUserListItemResp{
			ID: u.ID, Username: u.Username, Nickname: u.Nickname, Email: u.Email,
			AvatarUrl: u.AvatarUrl, Mark: u.Mark, Roles: rolesByUser[u.ID],
			Status: u.Status, SanctionState: sanctionState,
			LastLoginAt: u.LastLoginAt, LastActiveAt: u.LastActiveAt,
			CreatedAt: u.CreatedAt,
		})
	}

	pages := int((total + int64(pageSize) - 1) / int64(pageSize))
	return &dto.AdminUserPageResp{Total: total, Pages: pages, Page: page, PageSize: pageSize, List: list}, nil
}

func (s *adminService) GetAdminDetail(userID uint) (*dto.AdminUserDetailResp, error) {
	detail, err := s.repo.FindDetailByID(userID)
	if err != nil {
		return nil, err
	}
	if detail == nil {
		return nil, ErrUserNotFound
	}

	sanctionState := "active"
	if s.moderation != nil {
		if state, err := s.moderation.GetSanctionState(userID); err == nil && state != "" {
			sanctionState = state
		}
	}

	return &dto.AdminUserDetailResp{
		ID: detail.User.ID, Username: detail.User.Username, Nickname: detail.User.Nickname,
		Email: detail.User.Email, EmailVerified: detail.User.EmailVerifiedAt != nil,
		Phone: detail.User.Phone, Site: detail.User.Site, AvatarUrl: detail.User.AvatarUrl,
		Mark: detail.User.Mark, Status: detail.User.Status, PasswordSet: detail.User.PasswordSet,
		Roles: detail.Roles, RegisterAt: detail.User.CreatedAt,
		LastLoginAt: detail.User.LastLoginAt, LastActiveAt: detail.User.LastActiveAt,
		SanctionState: sanctionState,
	}, nil
}
```

在 `AdminService` 接口追加这两个方法签名。

- [ ] **Step 6: 跑测试确认通过**

Run: `go test ./internal/service/user/...`
Expected: PASS

- [ ] **Step 7: 写 handler 测试 + 实现**

```go
// internal/handler/user/admin_list_test.go
package user_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"github.com/vpt/blog-backend/internal/dto"
	userhandler "github.com/vpt/blog-backend/internal/handler/user"
)

func TestUserAdminHandler_ListAdmin_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := &adminServiceStub{listResp: &dto.AdminUserPageResp{Total: 1, Page: 1, PageSize: 10}}
	h := userhandler.NewUserAdminHandler(svc, zapNop())

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/users?page=1&page_size=10", nil)

	h.ListAdmin(c)
	require.Equal(t, http.StatusOK, w.Code)
}
```

（`adminServiceStub` 需要补 `listResp`/`detailResp` 字段和对应方法，遵循本文件已有 stub 风格）

在 `internal/handler/user/admin.go` 追加：

```go
// ListAdmin 管理端分页查询用户，支持关键词/角色/状态筛选。
// @Summary 管理端查询用户列表
// @Tags 用户管理
// @Produce json
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(10)
// @Param keyword query string false "关键词，匹配用户名/昵称/邮箱"
// @Param role query string false "角色筛选：ROLE_ADMIN/ROLE_VIP/ROLE_NORMAL"
// @Param status query string false "账号状态：active/disabled"
// @Success 200 {object} response.Response{data=dto.AdminUserPageResp}
// @Router /admin/users [get]
func (h *UserAdminHandler) ListAdmin(c *gin.Context) {
	var req dto.AdminUserListReq
	if !reqbind.Query(c, &req) {
		return
	}
	resp, err := h.svc.ListAdmin(&req)
	writeUserAdminResponse(c, resp, err)
}

// GetDetail 管理端查询用户详情。
// @Summary 管理端查询用户详情
// @Tags 用户管理
// @Produce json
// @Param id path int true "用户 ID"
// @Success 200 {object} response.Response{data=dto.AdminUserDetailResp}
// @Failure 404 {object} response.Response "用户不存在"
// @Router /admin/users/{id} [get]
func (h *UserAdminHandler) GetDetail(c *gin.Context) {
	targetUserID, ok := reqbind.PathUint(c, "id", "用户 ID")
	if !ok {
		return
	}
	resp, err := h.svc.GetAdminDetail(targetUserID)
	writeUserAdminResponse(c, resp, err)
}
```

- [ ] **Step 8: 跑测试确认通过**

Run: `go test ./internal/handler/user/...`
Expected: PASS

- [ ] **Step 9: 注册路由**

在 `internal/router/router.go` 里，`admin.POST("/users/:id/enable", ...)` 之后追加（注意路径顺序：具体路径 `/users/avatars/normalize` 已在前面，`GET /users` 与 `GET /users/:id` 不冲突，因为都在 `/admin` 前缀下且方法/路径都是新增）：

```go
	admin.GET("/users", handlers.userAdmin.ListAdmin)
	admin.GET("/users/:id", handlers.userAdmin.GetDetail)
```

- [ ] **Step 10: 编译并跑全部用户相关测试**

Run: `go build ./... && go test ./internal/service/user/... ./internal/handler/user/... ./internal/repository/user/...`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add internal/dto/user.go internal/service/user/admin.go internal/service/user/admin_list_test.go internal/handler/user/admin.go internal/handler/user/admin_list_test.go internal/router/router.go
git commit -m "feat(user): 新增管理端用户列表与详情接口"
```

---

### Task 6: 操作日志查询接口

**Files:**
- Modify: `internal/dto/user.go`（新增 `AdminOperationLogItemResp`、`AdminOperationLogPageResp`）
- Modify: `internal/service/user/admin.go`（`AdminService` 新增 `GetOperationLogs`，注入 `adminlog.Repository`）
- Create: `internal/service/user/admin_log_test.go`
- Modify: `internal/handler/user/admin.go`（新增 `GetOperationLogs` handler）
- Create: `internal/handler/user/admin_log_test.go`
- Modify: `internal/router/router.go`（注册 `GET /admin/users/:id/operation-logs`，构造 `adminlog` 仓储/服务并注入）

**Interfaces:**
- Consumes：Task 1 的 `adminlogrepo.Repository.ListByTargetUser`。
- Produces：`AdminService.GetOperationLogs(targetUserID uint, page, pageSize int) (*dto.AdminOperationLogPageResp, error)`。

- [ ] **Step 1: 扩展 dto**

```go
// AdminOperationLogItemResp 单条管理员操作日志。
type AdminOperationLogItemResp struct {
	ID           uint64         `json:"id"`
	OperatorID   uint           `json:"operator_id"`
	Action       string         `json:"action"`
	Detail       map[string]any `json:"detail,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
}

// AdminOperationLogPageResp 管理员操作日志分页响应。
type AdminOperationLogPageResp struct {
	Total    int64                        `json:"total"`
	Pages    int                          `json:"pages"`
	Page     int                          `json:"page"`
	PageSize int                          `json:"page_size"`
	List     []AdminOperationLogItemResp `json:"list"`
}
```

- [ ] **Step 2: 给 `adminService` 加 `logs adminlogrepo.Repository` 依赖**

在 `AdminDeps`（同 Task 5 找到的定义处）追加字段 `Logs adminlogrepo.Repository`；`adminService` struct 追加 `logs adminlogrepo.Repository` 字段；`NewAdminService` 里 `svc.logs = deps[0].Logs`。

- [ ] **Step 3: 写失败测试**

```go
// internal/service/user/admin_log_test.go
package user_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/vpt/blog-backend/internal/model"
	logmock "github.com/vpt/blog-backend/internal/repository/adminlog/mock"
	"github.com/vpt/blog-backend/internal/repository/user/mock"
	userservice "github.com/vpt/blog-backend/internal/service/user"
)

func TestAdminService_GetOperationLogs(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := mock.NewMockUserRepository(ctrl)
	logs := logmock.NewMockRepository(ctrl)

	logs.EXPECT().ListByTargetUser(gomock.Any(), uint(7), 0, 10).
		Return([]model.AdminOperationLog{{ID: 1, OperatorID: 1, TargetUserID: 7, Action: "grant_vip"}}, int64(1), nil)

	svc := userservice.NewAdminService(repo, &stubUserCacheService{}, userservice.AdminDeps{Logs: logs})
	resp, err := svc.GetOperationLogs(7, 1, 10)
	require.NoError(t, err)
	assert.Equal(t, int64(1), resp.Total)
	assert.Equal(t, "grant_vip", resp.List[0].Action)
}
```

- [ ] **Step 4: 跑测试确认失败**

Run: `go test ./internal/service/user/... -run TestAdminService_GetOperationLogs`
Expected: FAIL

- [ ] **Step 5: 实现**

```go
func (s *adminService) GetOperationLogs(targetUserID uint, page, pageSize int) (*dto.AdminOperationLogPageResp, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	entries, total, err := s.logs.ListByTargetUser(context.Background(), targetUserID, offset, pageSize)
	if err != nil {
		return nil, err
	}

	list := make([]dto.AdminOperationLogItemResp, 0, len(entries))
	for _, e := range entries {
		item := dto.AdminOperationLogItemResp{ID: e.ID, OperatorID: e.OperatorID, Action: e.Action, CreatedAt: e.CreatedAt}
		if e.Detail != nil {
			var detail map[string]any
			if err := json.Unmarshal([]byte(*e.Detail), &detail); err == nil {
				item.Detail = detail
			}
		}
		list = append(list, item)
	}

	pages := int((total + int64(pageSize) - 1) / int64(pageSize))
	return &dto.AdminOperationLogPageResp{Total: total, Pages: pages, Page: page, PageSize: pageSize, List: list}, nil
}
```

`AdminService` 接口追加 `GetOperationLogs(targetUserID uint, page, pageSize int) (*dto.AdminOperationLogPageResp, error)`；文件顶部 `import` 增加 `"encoding/json"` 和 `adminlogrepo "github.com/vpt/blog-backend/internal/repository/adminlog"`。

- [ ] **Step 6: 跑测试确认通过**

Run: `go test ./internal/service/user/...`
Expected: PASS

- [ ] **Step 7: handler + 路由**

```go
// internal/handler/user/admin_log_test.go — 同 Task 5 Step 7 的 stub 风格补一个 GetOperationLogs 用例，略
```

在 `internal/handler/user/admin.go` 追加：

```go
// GetOperationLogs 查询目标用户的管理员操作日志。
// @Summary 查询用户操作日志
// @Tags 用户管理
// @Produce json
// @Param id path int true "用户 ID"
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(10)
// @Success 200 {object} response.Response{data=dto.AdminOperationLogPageResp}
// @Router /admin/users/{id}/operation-logs [get]
func (h *UserAdminHandler) GetOperationLogs(c *gin.Context) {
	targetUserID, ok := reqbind.PathUint(c, "id", "用户 ID")
	if !ok {
		return
	}
	var req struct {
		Page     int `form:"page" binding:"omitempty,min=1"`
		PageSize int `form:"page_size" binding:"omitempty,min=1,max=50"`
	}
	if !reqbind.Query(c, &req) {
		return
	}
	resp, err := h.svc.GetOperationLogs(targetUserID, req.Page, req.PageSize)
	writeUserAdminResponse(c, resp, err)
}
```

在 `internal/router/router.go` 追加：

```go
	admin.GET("/users/:id/operation-logs", handlers.userAdmin.GetOperationLogs)
```

在构造 `userAdminSvc`（第 245-249 行）的地方，新增 `adminlogRepo := adminlogrepo.NewRepository(db)`，并把 `Logs: adminlogRepo` 加进 `userservice.AdminDeps{...}`；同时用 `adminlogSvc := adminlogservice.NewService(adminlogRepo)` 供 Task 7/8 注入到 `UserAdminHandler`/moderation `AdminHandler`。

- [ ] **Step 8: 编译 + 跑测试**

Run: `go build ./... && go test ./internal/...`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add internal/dto/user.go internal/service/user/admin.go internal/service/user/admin_log_test.go internal/handler/user/admin.go internal/handler/user/admin_log_test.go internal/router/router.go
git commit -m "feat(user): 新增用户操作日志查询接口"
```

---

### Task 7: 把操作日志接进用户管理的现有操作（VIP/禁用/头像清除）

**Files:**
- Modify: `internal/handler/user/admin.go`（`UserAdminHandler` 构造函数新增 `logRecorder adminlog.Recorder` 参数，`GrantVip`/`RevokeVip`/`DisableAccount`/`EnableAccount`/`ClearUserAvatar` 成功后调用）
- Modify: `internal/handler/user/admin_test.go`、`internal/handler/user/admin_status_test.go`（更新构造函数调用）
- Modify: `internal/router/router.go`（传入 Task 6 构造的 `adminlogSvc`）

**Interfaces:**
- Consumes：Task 1 的 `adminlog.Recorder`、`adminlog.Action*` 常量。

- [ ] **Step 1: 改构造函数签名**

```go
// NewUserAdminHandler 创建用户管理端处理器。
func NewUserAdminHandler(svc userservice.AdminService, log *zap.Logger, logRecorder adminlog.Recorder) *UserAdminHandler {
	return &UserAdminHandler{svc: svc, log: log, logRecorder: logRecorder}
}
```

`UserAdminHandler` struct 加字段 `logRecorder adminlog.Recorder`；顶部 import 加 `"github.com/vpt/blog-backend/internal/service/adminlog"`。

- [ ] **Step 2: 在各操作成功后写日志**

```go
func (h *UserAdminHandler) GrantVip(c *gin.Context) {
	targetUserID, ok := reqbind.PathUint(c, "id", "用户 ID")
	if !ok {
		return
	}
	resp, err := h.svc.GrantVip(targetUserID)
	if err == nil {
		h.logVipRoleChange(c, "grant", targetUserID)
		h.recordLog(c, adminlog.ActionGrantVIP, targetUserID, nil)
	}
	writeUserAdminResponse(c, resp, err)
}
```

同样在 `RevokeVip` 里加 `h.recordLog(c, adminlog.ActionRevokeVIP, targetUserID, nil)`；`DisableAccount` 成功分支加 `h.recordLog(c, adminlog.ActionDisableAccount, targetUserID, nil)`；`EnableAccount` 加 `h.recordLog(c, adminlog.ActionEnableAccount, targetUserID, nil)`；`ClearUserAvatar` 成功分支加 `h.recordLog(c, adminlog.ActionClearAvatar, targetUserID, nil)`。

在文件末尾追加辅助方法：

```go
func (h *UserAdminHandler) recordLog(c *gin.Context, action adminlog.Action, targetUserID uint, detail map[string]any) {
	if h.logRecorder == nil {
		return
	}
	operator := middleware.GetUserDetail(c)
	if operator == nil {
		return
	}
	if err := h.logRecorder.Record(c.Request.Context(), operator.ID, targetUserID, action, detail); err != nil {
		h.log.Warn("记录管理员操作日志失败", zap.Error(err), zap.String("action", string(action)))
	}
}
```

- [ ] **Step 3: 更新既有测试的构造函数调用**

在 `internal/handler/user/admin_test.go`、`admin_status_test.go`、`admin_list_test.go`、`admin_log_test.go` 里，所有 `userhandler.NewUserAdminHandler(svc, zapNop())` 改成 `userhandler.NewUserAdminHandler(svc, zapNop(), nil)`（`nil` recorder 时 `recordLog` 直接跳过，不影响断言）。

- [ ] **Step 4: 跑测试**

Run: `go test ./internal/handler/user/...`
Expected: PASS

- [ ] **Step 5: 接线 router.go**

在 `internal/router/router.go` 第 318 行：

```go
		userAdmin:           userhandler.NewUserAdminHandler(userAdminSvc, log, adminlogSvc),
```

- [ ] **Step 6: 编译**

Run: `go build ./...`
Expected: 无报错

- [ ] **Step 7: Commit**

```bash
git add internal/handler/user/admin.go internal/handler/user/admin_test.go internal/handler/user/admin_status_test.go internal/handler/user/admin_list_test.go internal/handler/user/admin_log_test.go internal/router/router.go
git commit -m "feat(user): VIP/禁用/头像清除操作写入操作日志"
```

---

### Task 8: 把操作日志接进内容审核的用户处罚操作（mute/ban/release/信任等级）

**Files:**
- Modify: `internal/handler/moderation/moderation.go`（`AdminHandler` 新增 `logRecorder adminlog.Recorder` 字段 + `SetOperationLogRecorder` setter，沿用 `SetObjectURLResolver` 的可选注入风格）
- Modify: `internal/handler/moderation/operations.go`（`setSanction`、`ReleaseUser`、`UpdateUserProfile` 成功后调用）
- Modify: `internal/router/moderation_admin.go`（`newModerationAdminHandler` 新增 `recorder adminlog.Recorder` 参数并调用 setter）
- Modify: `internal/router/router.go`（调用处传入 `adminlogSvc`）
- Modify: `internal/handler/moderation/moderation_test.go`、`internal/handler/moderation/operations_test.go`（若存在，补日志断言或保持不受影响）

**Interfaces:**
- Consumes：Task 1 的 `adminlog.Recorder`、`adminlog.Action*`；Task 6 在 router.go 构造的 `adminlogSvc`。

- [ ] **Step 1: `AdminHandler` 加 setter**

```go
// SetOperationLogRecorder 注入管理员操作日志记录器，在路由装配时调用。
func (h *AdminHandler) SetOperationLogRecorder(recorder adminlog.Recorder) {
	if h != nil {
		h.logRecorder = recorder
	}
}
```

struct 加字段 `logRecorder adminlog.Recorder`；顶部 import 加 `"github.com/vpt/blog-backend/internal/service/adminlog"`。

- [ ] **Step 2: 在 `setSanction`/`ReleaseUser`/`UpdateUserProfile` 里写日志**

```go
func (h *AdminHandler) setSanction(c *gin.Context, state moderationservice.SanctionState) {
	userID, ok := bindUserID(c)
	if !ok {
		return
	}
	var req dto.AdminModerationSanctionReq
	if !reqbind.JSON(c, &req) {
		return
	}
	actorID, ok := requiredReviewerID(c)
	if !ok {
		return
	}
	err := h.ops.SetUserSanction(c.Request.Context(), moderationservice.SetSanctionCommand{
		UserID: userID, ActorID: actorID, State: state, Until: req.Until, Reason: req.Reason,
	})
	if err == nil && h.logRecorder != nil {
		action := adminlog.ActionMute
		if state == moderationservice.SanctionBanned {
			action = adminlog.ActionBan
		}
		detail := map[string]any{"reason": req.Reason}
		if req.Until != nil {
			detail["until"] = *req.Until
		}
		_ = h.logRecorder.Record(c.Request.Context(), actorID, userID, action, detail)
	}
	writeOperationsResponse(c, nil, err)
}
```

```go
func (h *AdminHandler) ReleaseUser(c *gin.Context) {
	userID, ok := bindUserID(c)
	if !ok {
		return
	}
	actorID, ok := requiredReviewerID(c)
	if !ok {
		return
	}
	err := h.ops.ReleaseUserSanction(c.Request.Context(), userID, actorID)
	if err == nil && h.logRecorder != nil {
		_ = h.logRecorder.Record(c.Request.Context(), actorID, userID, adminlog.ActionRelease, nil)
	}
	writeOperationsResponse(c, nil, err)
}
```

在 `UpdateUserProfile` 的 `h.ops.SetUserTrust(...)` 调用之后：

```go
	err := h.ops.SetUserTrust(c.Request.Context(), moderationservice.SetTrustCommand{
		UserID: userID, ActorID: actorID, TrustLevel: moderationservice.TrustLevel(req.TrustLevel),
		ManualLocked: *req.ManualLocked, RestrictedUntil: req.RestrictedUntil,
	})
	if err == nil && h.logRecorder != nil {
		_ = h.logRecorder.Record(c.Request.Context(), actorID, userID, adminlog.ActionUpdateTrustLevel, map[string]any{
			"trust_level": string(req.TrustLevel),
		})
	}
	writeOperationsResponse(c, nil, err)
```

- [ ] **Step 3: 传参链路**

`internal/router/moderation_admin.go` 的 `newModerationAdminHandler` 签名追加 `recorder adminlog.Recorder`，函数体里 `handler.SetOperationLogRecorder(recorder)`；顶部 import 加 `adminlog "github.com/vpt/blog-backend/internal/service/adminlog"`。

`internal/router/router.go` 第 314 行调用处追加实参 `adminlogSvc`：

```go
		moderationAdmin:     newModerationAdminHandler(moderationReviewSvc, userCacheSvc, moderationOperationsSvc, cfg.Moderation.Rules.MaxImportFileMB, objectStore, adminlogSvc, moderationRuntime.ruleSvc),
```

（`adminlogSvc` 必须在此行之前已构造——若 Task 6 里构造点晚于第 314 行，把 `adminlogRepo`/`adminlogSvc` 的构造语句移到 `userRepo := userrepo.NewUserRepository(db)` 附近，即第 228 行之后。）

- [ ] **Step 4: 编译确认签名一致**

Run: `go build ./...`
Expected: 无报错（重点检查 `newModerationAdminHandler` 所有调用点参数个数一致——本仓库应该只有 router.go 这一处调用）

- [ ] **Step 5: 跑 moderation 相关测试**

Run: `go test ./internal/handler/moderation/... ./internal/router/...`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add internal/handler/moderation/moderation.go internal/handler/moderation/operations.go internal/router/moderation_admin.go internal/router/router.go
git commit -m "feat(moderation): 禁言/封禁/解除/信任等级调整写入操作日志"
```

---

### Task 9: 后端整体验证

**Files:** 无新文件，仅验证。

- [ ] **Step 1: 全量测试**

Run: `go test ./...`
Expected: PASS，无失败用例

- [ ] **Step 2: 静态检查（若仓库配置了 lint）**

Run: `go vet ./...`
Expected: 无报错

- [ ] **Step 3: 确认迁移文件可被识别**

Run: `ls migrations | tail -5`
Expected: 看到 `20260704_admin_operation_log.sql` 排在最后（按文件名排序）

---

## 前端任务（blog-frontend 仓库，工作目录 `/Users/vpt/Documents/Codes/blog/blog-frontend`）

### Task 10: `packages/api` 新增类型与客户端方法

**Files:**
- Modify: `packages/api/src/types/user.ts`
- Modify: `packages/api/src/client.ts`

**Interfaces:**
- Produces：`AdminUserListReq`、`AdminUserListItemResp`、`AdminUserPageResp`、`AdminUserDetailResp`、`AdminOperationLogItemResp`、`AdminOperationLogPageResp`；`apiClient.users.listAdmin/getAdminDetail/disableAccount/enableAccount/getOperationLogs`。
- 供 Task 11-19 的前端 hook/组件消费。

- [ ] **Step 1: 类型定义**

在 `packages/api/src/types/user.ts` 的 `BatchPresenceResp`（文件末尾）之后追加：

```ts
/** GET /admin/users 管理端用户列表查询参数 */
export interface AdminUserListReq {
  page?: number;
  page_size?: number;
  keyword?: string;
  role?: "ROLE_ADMIN" | "ROLE_VIP" | "ROLE_NORMAL";
  status?: "active" | "disabled";
}

/** GET /admin/users 管理端用户列表项 */
export interface AdminUserListItemResp {
  id: number;
  username: string;
  nickname?: string;
  email?: string;
  avatar_url?: string;
  mark?: string;
  roles: string[];
  status: number;
  sanction_state: "active" | "muted" | "banned";
  last_login_at?: string;
  last_active_at?: string;
  is_online: boolean;
  created_at: string;
}

/** GET /admin/users 分页响应 */
export interface AdminUserPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: AdminUserListItemResp[];
}

/** GET /admin/users/:id 管理端用户详情 */
export interface AdminUserDetailResp {
  id: number;
  username: string;
  nickname?: string;
  email?: string;
  email_verified: boolean;
  phone?: string;
  site?: string;
  avatar_url?: string;
  mark?: string;
  status: number;
  password_set: boolean;
  roles: string[];
  register_at: string;
  last_login_at?: string;
  last_active_at?: string;
  is_online: boolean;
  sanction_state: "active" | "muted" | "banned";
  likes_count: number;
  moments_count: number;
}

/** GET /admin/users/:id/operation-logs 单条操作日志 */
export interface AdminOperationLogItemResp {
  id: number;
  operator_id: number;
  action: string;
  detail?: Record<string, unknown>;
  created_at: string;
}

/** GET /admin/users/:id/operation-logs 分页响应 */
export interface AdminOperationLogPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: AdminOperationLogItemResp[];
}
```

- [ ] **Step 2: client.ts 新增方法**

在 `packages/api/src/client.ts` 的 `users` 域（`clearUserAvatar` 方法之后，第 856 行附近）追加：

```ts
      /** 管理端分页查询用户，支持关键词/角色/状态筛选，需管理员登录 */
      listAdmin: (req: AdminUserListReq = {}) => {
        const p = new URLSearchParams();
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        if (req.keyword) p.set("keyword", req.keyword);
        if (req.role) p.set("role", req.role);
        if (req.status) p.set("status", req.status);
        const qs = p.toString();
        return fetchAuthed<AdminUserPageResp>(`/admin/users${qs ? `?${qs}` : ""}`, {
          method: "GET",
        });
      },
      /** 管理端查询用户详情，需管理员登录 */
      getAdminDetail: (userId: number) =>
        fetchAuthed<AdminUserDetailResp>(`/admin/users/${userId}`, { method: "GET" }),
      /** 禁用目标用户账号登录，需管理员登录 */
      disableAccount: (userId: number) =>
        fetchAuthed<void>(`/admin/users/${userId}/disable`, { method: "POST" }),
      /** 启用目标用户账号登录，需管理员登录 */
      enableAccount: (userId: number) =>
        fetchAuthed<void>(`/admin/users/${userId}/enable`, { method: "POST" }),
      /** 分页查询目标用户的管理员操作日志，需管理员登录 */
      getOperationLogs: (userId: number, req: { page?: number; page_size?: number } = {}) => {
        const p = new URLSearchParams();
        if (req.page !== undefined) p.set("page", String(req.page));
        if (req.page_size !== undefined) p.set("page_size", String(req.page_size));
        const qs = p.toString();
        return fetchAuthed<AdminOperationLogPageResp>(
          `/admin/users/${userId}/operation-logs${qs ? `?${qs}` : ""}`,
          { method: "GET" },
        );
      },
```

确认文件顶部的 `import type { ... } from "./types/user"`（或聚合的 `./types` barrel）已经把新增类型导出——检查 `packages/api/src/index.ts` 是否 `export *` 整个 `types/user.ts`，若是则无需改动；若类型是逐个具名导出，追加这几个新类型名。

- [ ] **Step 3: 类型检查**

Run: `pnpm --filter @repo/api build` （或该包的 `tsc --noEmit`，以 `package.json` 里实际 script 为准，先 `cat packages/api/package.json` 确认脚本名）
Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/types/user.ts packages/api/src/client.ts
git commit -m "feat(api): 新增管理端用户列表/详情/禁用/操作日志客户端方法"
```

---

### Task 11: 用户列表查询状态扩展（筛选 codec + hook）

**Files:**
- Modify: `apps/admin/src/modules/users/model.ts`
- Modify: `apps/admin/src/modules/users/model.test.ts`（若不存在则新建）
- Modify: `apps/admin/src/modules/users/hooks/use-admin-user-list.ts`
- Modify: `apps/admin/src/modules/users/hooks/use-admin-user-list.test.ts`

**Interfaces:**
- Consumes：Task 10 的 `apiClient.users.listAdmin`、`AdminUserListItemResp`、`AdminUserPageResp`。
- Produces：`AdminUserListFilters{ keyword: string; role: string; status: string }`、`AdminUserListQueryState{ page: number; filters: AdminUserListFilters }`、`userListQueryCodec`（沿用 `AdminListQueryCodec` 接口）；`useAdminUserList()` 返回值新增 `filters`、`setFilters`（原 `search`/`setSearch` 废弃，改名统一走 `filters.keyword`）。
- Task 12（UsersPage/Toolbar）、Task 13（详情弹层触发的 refetch）依赖这里的返回形状。

- [ ] **Step 1: 改 `model.ts`（参照 `moments/model.ts` 的 `AdminMomentListQueryState` 写法）**

把 `AdminUserListQueryState`/`userListQueryCodec`/`UserRow` 相关部分替换为：

```ts
import type { AdminUserListItemResp } from "@repo/api";
import type { AdminListQueryCodec } from "../../lib/admin-list-query";
import {
  hasActiveListPage,
  hasActiveStringFilters,
  parseListPage,
  parseStringFilter,
  writeListPage,
  writeStringFilter,
} from "../../lib/admin-list-query";

export interface AdminUserListFilters {
  keyword: string;
  role: string;
  status: string;
  [key: string]: string | undefined;
}

export interface AdminUserListQueryState {
  page: number;
  filters: AdminUserListFilters;
}

const DEFAULT_USER_LIST_FILTERS: AdminUserListFilters = {
  keyword: "",
  role: "all",
  status: "all",
};

export const DEFAULT_USER_LIST_QUERY_STATE: AdminUserListQueryState = {
  page: 1,
  filters: DEFAULT_USER_LIST_FILTERS,
};

export const userListQueryCodec: AdminListQueryCodec<AdminUserListQueryState> = {
  defaultState: DEFAULT_USER_LIST_QUERY_STATE,
  parse(params) {
    return {
      page: parseListPage(params),
      filters: {
        keyword: parseStringFilter(params, "keyword", DEFAULT_USER_LIST_FILTERS.keyword),
        role: parseStringFilter(params, "role", DEFAULT_USER_LIST_FILTERS.role),
        status: parseStringFilter(params, "status", DEFAULT_USER_LIST_FILTERS.status),
      },
    };
  },
  write(state) {
    const params = new URLSearchParams();
    writeListPage(params, state.page);
    writeStringFilter(params, "keyword", state.filters.keyword, DEFAULT_USER_LIST_FILTERS.keyword);
    writeStringFilter(params, "role", state.filters.role, DEFAULT_USER_LIST_FILTERS.role);
    writeStringFilter(params, "status", state.filters.status, DEFAULT_USER_LIST_FILTERS.status);
    return params;
  },
  hasActive(state) {
    return (
      hasActiveListPage(state.page) ||
      hasActiveStringFilters(state.filters, DEFAULT_USER_LIST_FILTERS)
    );
  },
};

export interface UserRow {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  mark?: string;
  roles: string[];
  isVip: boolean;
  isAdmin: boolean;
  isOnline: boolean;
  accountStatus: "active" | "disabled";
  sanctionState: "active" | "muted" | "banned";
  lastActiveAt: string;
  registerAt: string;
}

export function mapUserToRow(item: AdminUserListItemResp): UserRow {
  const roles = item.roles ?? [];
  return {
    id: String(item.id),
    username: item.username,
    displayName: item.nickname ?? `用户 #${item.id}`,
    email: item.email,
    mark: item.mark,
    roles,
    isVip: roles.includes("ROLE_VIP"),
    isAdmin: roles.includes("ROLE_ADMIN"),
    isOnline: item.is_online ?? false,
    accountStatus: item.status === 1 ? "active" : "disabled",
    sanctionState: item.sanction_state,
    lastActiveAt: formatAdminDateTime(item.last_active_at ?? item.last_login_at),
    registerAt: formatAdminDateTime(item.created_at),
  };
}

function formatAdminDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function getAccountStatusBadge(row: UserRow): { label: string; variant: "secondary" | "destructive" } {
  return row.accountStatus === "active"
    ? { label: "正常", variant: "secondary" }
    : { label: "已禁用", variant: "destructive" };
}

export function getSanctionBadge(row: UserRow): { label: string; variant: "secondary" | "warning" | "destructive" } {
  switch (row.sanctionState) {
    case "muted":
      return { label: "禁言", variant: "warning" };
    case "banned":
      return { label: "封禁", variant: "destructive" };
    default:
      return { label: "正常", variant: "secondary" };
  }
}
```

删除原来的 `matchUserSearch`（不再需要前端过滤，搜索全部走后端）。

（`Badge` 的 `variant` 可选值以 `packages/ui/src/badge.tsx` 实际导出为准——若没有 `warning` variant，实现前先 `grep -n "variant" packages/ui/src/badge.tsx` 确认可用值列表，把上面 `getSanctionBadge` 的 `"warning"` 换成一个存在的近似语义值，比如 `"outline"`。）

- [ ] **Step 2: 改 `use-admin-user-list.ts`**

```ts
import { useCallback, useEffect, useState } from "react";
import type { AdminUserPageResp } from "@repo/api";
import { useAdminListQuery } from "../../../lib/admin-list-query";
import { apiClient } from "../../../lib/api";
import { mapUserToRow, userListQueryCodec, type AdminUserListFilters, type UserRow } from "../model";

export interface UseAdminUserListResult {
  rows: UserRow[];
  pageData: AdminUserPageResp | null;
  isLoading: boolean;
  error: Error | null;
  page: number;
  setPage: (page: number) => void;
  filters: AdminUserListFilters;
  setFilters: (updater: (previous: AdminUserListFilters) => AdminUserListFilters) => void;
  resetListQuery: () => void;
  hasActiveListQuery: boolean;
  refetch: () => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 10;

export function useAdminUserList(): UseAdminUserListResult {
  const { state, patchState, resetListQuery, hasActiveListQuery } =
    useAdminListQuery(userListQueryCodec);
  const { page, filters } = state;
  const [pageData, setPageData] = useState<AdminUserPageResp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(async () => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiClient.users.listAdmin({
          page,
          page_size: DEFAULT_PAGE_SIZE,
          keyword: filters.keyword.trim() || undefined,
          role: filters.role === "all" ? undefined : (filters.role as "ROLE_ADMIN" | "ROLE_VIP" | "ROLE_NORMAL"),
          status: filters.status === "all" ? undefined : (filters.status as "active" | "disabled"),
        });
        if (cancelled) return;
        setPageData(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载用户失败"));
        setPageData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [page, filters, reloadToken]);

  const setPage = useCallback(
    (nextPage: number) => {
      patchState((previous) => ({ ...previous, page: nextPage }));
    },
    [patchState],
  );

  const setFilters = useCallback(
    (updater: (previous: AdminUserListFilters) => AdminUserListFilters) => {
      patchState((previous) => ({ ...previous, page: 1, filters: updater(previous.filters) }));
    },
    [patchState],
  );

  const rows = pageData?.list.map(mapUserToRow) ?? [];

  return {
    rows,
    pageData,
    isLoading,
    error,
    page,
    setPage,
    filters,
    setFilters,
    resetListQuery,
    hasActiveListQuery,
    refetch,
  };
}
```

- [ ] **Step 3: 改测试**

在 `use-admin-user-list.test.ts` 里，把原来 mock `apiClient.users.listPublic` 的地方改成 mock `apiClient.users.listAdmin`，断言调用参数包含 `keyword`/`role`/`status`；`model.test.ts` 新增/更新 `mapUserToRow` 对新字段（`sanction_state`/`status`/`created_at`）的映射断言，删除 `matchUserSearch` 相关测试。参照 `apps/admin/src/modules/moments/hooks/use-moment-list.test.ts` 的筛选参数断言写法（若存在同名测试可直接抄结构）。

- [ ] **Step 4: 跑测试**

Run: `pnpm --filter admin test:run model.test.ts use-admin-user-list.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/modules/users/model.ts apps/admin/src/modules/users/model.test.ts apps/admin/src/modules/users/hooks/use-admin-user-list.ts apps/admin/src/modules/users/hooks/use-admin-user-list.test.ts
git commit -m "feat(admin): 用户列表改为后端真实关键词/角色/状态筛选"
```

---

### Task 12: `UsersPage.tsx` 重排布局 + 筛选工具栏 + 新列

**Files:**
- Modify: `apps/admin/src/modules/users/components/UserListToolbar.tsx`
- Modify: `apps/admin/src/modules/users/components/UserListToolbar.test.tsx`（若不存在则新建）
- Modify: `apps/admin/src/modules/users/UsersPage.tsx`
- Modify: `apps/admin/src/modules/users/UsersPage.test.tsx`
- Modify: `apps/admin/src/modules/users/components/UserMobileList.tsx`

**Interfaces:**
- Consumes：Task 11 的 `useAdminUserList()`（`filters`/`setFilters` 替代 `search`/`setSearch`）、`UserRow`（新字段 `accountStatus`/`sanctionState`/`email`/`registerAt`）。
- Produces：`UsersPage` 内新增 `selectedUserId` state，供 Task 14 的详情 Modal 消费（本任务先只做「点击行→设置 selectedUserId」，Modal 本体留给 Task 14）。

- [ ] **Step 1: 改 `UserListToolbar.tsx` 加角色/状态筛选**

```tsx
import type { AdminUserListFilters } from "../model";
import { Select } from "@repo/ui";
import { AdminListToolbar } from "../../../components/AdminListToolbar";

interface UserListToolbarProps {
  filters: AdminUserListFilters;
  onFiltersChange: (updater: (previous: AdminUserListFilters) => AdminUserListFilters) => void;
  canClear?: boolean;
  onClear?: () => void;
}

export function UserListToolbar({ filters, onFiltersChange, canClear = false, onClear }: UserListToolbarProps) {
  return (
    <AdminListToolbar
      searchLabel="搜索用户"
      searchPlaceholder="搜索用户名、昵称或邮箱…"
      searchValue={filters.keyword}
      onSearchChange={(value) => onFiltersChange((previous) => ({ ...previous, keyword: value }))}
      canClear={canClear}
      onClear={onClear}
      filters={
        <>
          <Select
            aria-label="筛选角色"
            selectedKey={filters.role}
            onSelectionChange={(key) =>
              onFiltersChange((previous) => ({ ...previous, role: String(key) }))
            }
            className="w-full sm:w-32"
          >
            <Select.Item id="all" label="全部角色" />
            <Select.Item id="ROLE_ADMIN" label="管理员" />
            <Select.Item id="ROLE_VIP" label="VIP" />
            <Select.Item id="ROLE_NORMAL" label="普通用户" />
          </Select>
          <Select
            aria-label="筛选账号状态"
            selectedKey={filters.status}
            onSelectionChange={(key) =>
              onFiltersChange((previous) => ({ ...previous, status: String(key) }))
            }
            className="w-full sm:w-32"
          >
            <Select.Item id="all" label="全部状态" />
            <Select.Item id="active" label="正常" />
            <Select.Item id="disabled" label="已禁用" />
          </Select>
        </>
      }
    />
  );
}
```

- [ ] **Step 2: `UsersPage.tsx` 移除头像工具、加列、加行点击**

移除 `import { AvatarNormalizeTool } ...` 和 `<AvatarNormalizeTool />` 渲染；`useAdminUserList()` 解构改为 `filters, setFilters`；`UserListToolbar` 调用改传 `filters`/`onFiltersChange={setFilters}`；页头 `action` 里在「刷新」按钮旁加一个跳转 `/users/tools` 的按钮：

```tsx
import { useNavigate } from "react-router";
// ...
const navigate = useNavigate();
// ...
action={
  <div className="flex w-full gap-2 sm:w-auto">
    <Button size="sm" variant="ghost" className="shrink-0" onPress={() => navigate("/users/tools")}>
      <SvgIcon name="tool" size={15} />
      工具
    </Button>
    <Button size="sm" variant="outline" className="w-full shrink-0 sm:w-auto" onPress={() => void refetch()}>
      <SvgIcon name="refresh-cw" size={15} />
      刷新
    </Button>
  </div>
}
```

（若 `@repo/icons` 没有 `tool` 图标，用 `grep -rn "SvgIcon name=" apps/admin/src | grep -o 'name="[a-z-]*"' | sort -u` 先确认可用图标名，换成一个语义相近的已存在图标，比如 `settings`。）

`columns` 里在「角色」列之后插入两列，用 Task 11 在 `model.ts` 里新增的 `getAccountStatusBadge`/`getSanctionBadge`：

```tsx
{
  id: "accountStatus",
  header: "账号",
  width: "12%",
  minWidth: 88,
  className: "text-center",
  headerClassName: "text-center [&>div]:justify-center",
  cell: (user) => {
    const badge = getAccountStatusBadge(user);
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  },
},
{
  id: "sanctionState",
  header: "内容",
  width: "12%",
  minWidth: 88,
  className: "text-center",
  headerClassName: "text-center [&>div]:justify-center",
  cell: (user) => {
    const badge = getSanctionBadge(user);
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  },
},
```

把原「操作」列的按钮从「授予/取消 VIP」改为「查看详情」：

```tsx
{
  id: "actions",
  header: "操作",
  width: "14%",
  minWidth: 96,
  className: "text-center",
  headerClassName: "text-center [&>div]:justify-center",
  cell: (user) => (
    <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs"
      onPress={() => setSelectedUserId(user.id)}>
      查看详情
    </Button>
  ),
},
```

组件顶部加 `const [selectedUserId, setSelectedUserId] = useState<string | null>(null);`；导入 `getAccountStatusBadge, getSanctionBadge` from `"./model"`。本任务先不渲染 Modal（Task 14 补），只保留 state 和「查看详情」按钮。

同时把移动端分支的 `<UserMobileList>` 调用从 `togglingUserId={togglingUserId} onToggleVip={...}` 改为 `onViewDetail={(user) => setSelectedUserId(user.id)}`，并删除 `UsersPage.tsx` 里现在已经不需要的 `togglingUserId`/`handleToggleVip` state 和函数（VIP 操作已经整个搬进 Task 14 的详情弹层）。

- [ ] **Step 3: `UserMobileList.tsx` 同步字段**

在移动端卡片的 badge 区域（原第 62-69 行）追加账号/内容状态 badge，复用同一对辅助函数：

```tsx
import { getAccountStatusBadge, getSanctionBadge } from "../model";
// ...
<div className="mt-3 flex flex-wrap items-center gap-1.5">
  {user.isAdmin ? <Badge variant="brand">管理员</Badge> : null}
  {user.isVip ? <Badge variant="success">VIP</Badge> : null}
  {!user.isAdmin && !user.isVip ? <Badge variant="secondary">普通用户</Badge> : null}
  <Badge variant={user.isOnline ? "success" : "secondary"}>{user.isOnline ? "在线" : "离线"}</Badge>
  <Badge variant={getAccountStatusBadge(user).variant}>{getAccountStatusBadge(user).label}</Badge>
  <Badge variant={getSanctionBadge(user).variant}>{getSanctionBadge(user).label}</Badge>
</div>
```

把原来的「授予/取消 VIP」按钮换成「查看详情」，`onPress={() => onViewDetail(user)}`（`UserMobileListProps` 新增 `onViewDetail: (user: UserRow) => void`，替换原 `togglingUserId`/`onToggleVip` 两个 prop）。

- [ ] **Step 4: 更新测试**

`UsersPage.test.tsx`：mock `apiClient.users.listAdmin` 替代 `listPublic`；断言表格出现「账号」「内容」两列表头；断言不再渲染 `AvatarNormalizeTool`（`screen.queryByText("头像归一化")` 应为 `null`）；断言「工具」按钮存在。`UserListToolbar.test.tsx`：断言渲染两个筛选 `Select` 并触发 `onFiltersChange`。

- [ ] **Step 5: 跑测试**

Run: `pnpm --filter admin test:run UsersPage.test.tsx UserListToolbar.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/modules/users/components/UserListToolbar.tsx apps/admin/src/modules/users/components/UserListToolbar.test.tsx apps/admin/src/modules/users/UsersPage.tsx apps/admin/src/modules/users/UsersPage.test.tsx apps/admin/src/modules/users/components/UserMobileList.tsx apps/admin/src/modules/users/model.ts
git commit -m "feat(admin): 用户列表页移除头像工具、加角色/状态筛选与账号/内容状态列"
```

---

### Task 13: 抽取单用户头像工具片段（供详情弹层复用）

**Files:**
- Modify: `apps/admin/src/modules/users/components/AvatarNormalizeTool.tsx`（拆成 `SingleUserAvatarTool` + `AllUsersAvatarTool` 两个导出）
- Modify: `apps/admin/src/modules/users/components/AvatarNormalizeTool.test.tsx`（拆成对应两个测试文件或保留一个文件测两个组件）

**Interfaces:**
- Produces：`SingleUserAvatarTool({ userId }: { userId: number })`（无用户 ID 输入框，直接对传入的 `userId` 操作，供 Task 16 的详情弹层「头像」Tab 用）；`AllUsersAvatarTool()`（原「处理全部」+「处理单个用户」两个按钮，保留手动输入 ID 的整页版本，供 Task 19 的 `/users/tools` 用）。

- [ ] **Step 1: 拆分组件**

把现有 `AvatarNormalizeTool.tsx`（157 行）里 `parseOptionalUserId`/`buildSummary`/`isActionableItem`/`STATUS_LABELS` 保留为文件顶部共享工具函数。新增导出 `SingleUserAvatarTool`：

```tsx
export function SingleUserAvatarTool({ userId }: { userId: number }) {
  const [clearInvalid, setClearInvalid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NormalizeAvatarItem | null>(null);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const data = await apiClient.users.normalizeAvatars({ user_id: userId, clear_invalid: clearInvalid });
      const item = data.items[0] ?? null;
      setResult(item);
      addToast(item ? `${STATUS_LABELS[item.status] ?? item.status}` : "已合规，无需处理", "success");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "头像归一化失败，请稍后重试";
      setError(message);
      addToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [userId, clearInvalid]);

  const handleClearAvatar = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await apiClient.users.clearUserAvatar(userId);
      addToast("已清除该用户头像", "success");
      setResult(null);
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : "清除头像失败，请稍后重试", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [userId]);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        检查该用户头像是否符合 240px、20KB 规范；不合规则压缩为 WebP 并替换。
      </p>
      <Checkbox isSelected={clearInvalid} onChange={setClearInvalid} isDisabled={isSubmitting} label="无法处理时自动清除" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" isLoading={isSubmitting} onPress={() => void handleSubmit()}>
          检查并处理
        </Button>
        <Button size="sm" variant="outline" isLoading={isSubmitting} onPress={() => void handleClearAvatar()}>
          清除头像
        </Button>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {result ? (
        <p className="text-sm text-muted-foreground">
          {STATUS_LABELS[result.status] ?? result.status}
          {result.message ? `：${result.message}` : ""}
        </p>
      ) : null}
    </div>
  );
}
```

把原组件重命名导出为 `AllUsersAvatarTool`（内容不变，只改函数名和文件里对 `AvatarNormalizeTool` 的引用），原文件名可以保持 `AvatarNormalizeTool.tsx` 不变（两个导出都在这个文件里，避免多余的文件搬迁）。

- [ ] **Step 2: 更新/新增测试**

在 `AvatarNormalizeTool.test.tsx` 里把原有对 `AvatarNormalizeTool` 组件的测试改成测 `AllUsersAvatarTool`（改导入名即可，行为不变）；新增 `describe("SingleUserAvatarTool", ...)`，覆盖：渲染 checkbox/两个按钮、点击「检查并处理」调用 `apiClient.users.normalizeAvatars({ user_id, clear_invalid })`、点击「清除头像」调用 `apiClient.users.clearUserAvatar(userId)`。

- [ ] **Step 3: 跑测试**

Run: `pnpm --filter admin test:run AvatarNormalizeTool.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/modules/users/components/AvatarNormalizeTool.tsx apps/admin/src/modules/users/components/AvatarNormalizeTool.test.tsx
git commit -m "refactor(admin): 头像归一化工具拆分为单用户/全量两个组件"
```

---

### Task 14: 用户详情弹层——基本信息 + 角色与账号 Tab

**Files:**
- Create: `apps/admin/src/modules/users/hooks/use-user-detail.ts`
- Create: `apps/admin/src/modules/users/hooks/use-user-detail.test.ts`
- Create: `apps/admin/src/modules/users/components/UserDetailModal.tsx`
- Create: `apps/admin/src/modules/users/components/UserDetailModal.test.tsx`
- Modify: `apps/admin/src/modules/users/UsersPage.tsx`（渲染 `<UserDetailModal>`）
- Modify: `apps/admin/src/modules/users/UsersPage.test.tsx`

**Interfaces:**
- Consumes：Task 10 的 `apiClient.users.getAdminDetail/grantVipRole/revokeVipRole/disableAccount/enableAccount`；`@repo/ui` 的 `Modal`/`Tabs`/`TabsList`/`TabsItem`/`TabsPanels`/`TabsPanel`（用法参照 `ModerationPage.tsx`）。
- Produces：`useUserDetail(userId: number | null)` 返回 `{ detail, isLoading, error, reload, grantVip, revokeVip, disableAccount, enableAccount, isMutating }`；`<UserDetailModal userId={string | null} onClose={() => void} onChanged={() => void} />`（`onChanged` 在任意操作成功后调用，供 `UsersPage` 刷新列表）。本任务先只做「基本信息」「角色与账号」两个 Tab，其余 3 个 Tab 留给 Task 15/16/17。

- [ ] **Step 1: 写 `use-user-detail.ts` 的失败测试**

```ts
// apps/admin/src/modules/users/hooks/use-user-detail.test.ts
import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "../../../lib/api";
import { useUserDetail } from "./use-user-detail";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    users: {
      getAdminDetail: vi.fn(),
      grantVipRole: vi.fn(),
      revokeVipRole: vi.fn(),
      disableAccount: vi.fn(),
      enableAccount: vi.fn(),
    },
  },
}));

describe("useUserDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("userId 为 null 时不发请求", () => {
    const { result } = renderHook(() => useUserDetail(null));
    expect(result.current.isLoading).toBe(false);
    expect(apiClient.users.getAdminDetail).not.toHaveBeenCalled();
  });

  it("加载详情成功", async () => {
    vi.mocked(apiClient.users.getAdminDetail).mockResolvedValue({
      id: 7, username: "vpt", email_verified: true, password_set: true,
      roles: ["ROLE_NORMAL"], register_at: "2026-01-01T00:00:00Z",
      is_online: false, sanction_state: "active", status: 1,
      likes_count: 0, moments_count: 0,
    });

    const { result } = renderHook(() => useUserDetail(7));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.detail?.username).toBe("vpt");
  });

  it("grantVip 成功后重新加载详情", async () => {
    vi.mocked(apiClient.users.getAdminDetail).mockResolvedValue({
      id: 7, username: "vpt", email_verified: true, password_set: true,
      roles: ["ROLE_NORMAL"], register_at: "2026-01-01T00:00:00Z",
      is_online: false, sanction_state: "active", status: 1,
      likes_count: 0, moments_count: 0,
    });
    vi.mocked(apiClient.users.grantVipRole).mockResolvedValue({ user_id: 7, roles: ["ROLE_NORMAL", "ROLE_VIP"] });

    const { result } = renderHook(() => useUserDetail(7));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.grantVip();
    });

    expect(apiClient.users.grantVipRole).toHaveBeenCalledWith(7);
    expect(apiClient.users.getAdminDetail).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter admin test:run use-user-detail.test.ts`
Expected: FAIL（`use-user-detail.ts` 不存在）

- [ ] **Step 3: 实现 hook**

```ts
// apps/admin/src/modules/users/hooks/use-user-detail.ts
import { useCallback, useEffect, useState } from "react";
import { ApiError, type AdminUserDetailResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";

export interface UseUserDetailResult {
  detail: AdminUserDetailResp | null;
  isLoading: boolean;
  error: Error | null;
  isMutating: boolean;
  reload: () => Promise<void>;
  grantVip: () => Promise<void>;
  revokeVip: () => Promise<void>;
  disableAccount: () => Promise<void>;
  enableAccount: () => Promise<void>;
}

export function useUserDetail(userId: number | null): UseUserDetailResult {
  const [detail, setDetail] = useState<AdminUserDetailResp | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const reload = useCallback(async () => {
    if (userId === null) {
      setDetail(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.users.getAdminDetail(userId);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("加载用户详情失败"));
      setDetail(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const runMutation = useCallback(
    async (action: () => Promise<unknown>, successMessage: string) => {
      setIsMutating(true);
      try {
        await action();
        addToast(successMessage, "success");
        await reload();
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "操作失败，请稍后重试", "error");
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [reload],
  );

  const grantVip = useCallback(async () => {
    if (userId === null) return;
    await runMutation(() => apiClient.users.grantVipRole(userId), "已授予 VIP");
  }, [userId, runMutation]);

  const revokeVip = useCallback(async () => {
    if (userId === null) return;
    await runMutation(() => apiClient.users.revokeVipRole(userId), "已取消 VIP");
  }, [userId, runMutation]);

  const disableAccount = useCallback(async () => {
    if (userId === null) return;
    await runMutation(() => apiClient.users.disableAccount(userId), "已禁用账号");
  }, [userId, runMutation]);

  const enableAccount = useCallback(async () => {
    if (userId === null) return;
    await runMutation(() => apiClient.users.enableAccount(userId), "已启用账号");
  }, [userId, runMutation]);

  return { detail, isLoading, error, isMutating, reload, grantVip, revokeVip, disableAccount, enableAccount };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter admin test:run use-user-detail.test.ts`
Expected: PASS

- [ ] **Step 5: 写 `UserDetailModal.tsx`（基本信息 + 角色与账号两个 Tab）**

```tsx
// apps/admin/src/modules/users/components/UserDetailModal.tsx
import { Badge, Button, Modal, Tabs, TabsItem, TabsList, TabsPanel, TabsPanels } from "@repo/ui";
import { useUserDetail } from "../hooks/use-user-detail";

interface UserDetailModalProps {
  userId: number | null;
  onClose: () => void;
  onChanged?: () => void;
}

export function UserDetailModal({ userId, onClose, onChanged }: UserDetailModalProps) {
  const { detail, isLoading, error, isMutating, grantVip, revokeVip, disableAccount, enableAccount } =
    useUserDetail(userId);

  const isOpen = userId !== null;

  async function withRefresh(action: () => Promise<void>) {
    await action();
    onChanged?.();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex min-h-[420px] flex-col gap-4 p-1">
        <h2 className="text-lg font-semibold text-foreground">
          用户详情 {detail ? `#${detail.id} · ${detail.nickname ?? detail.username}` : ""}
        </h2>

        {error ? <p role="alert" className="text-sm text-destructive">{error.message}</p> : null}
        {isLoading || !detail ? (
          <p className="text-sm text-muted-foreground">加载中…</p>
        ) : (
          <Tabs defaultSelectedKey="profile" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mb-3">
              <TabsItem id="profile">基本信息</TabsItem>
              <TabsItem id="role">角色与账号</TabsItem>
            </TabsList>
            <TabsPanels className="flex-1 overflow-y-auto">
              <TabsPanel id="profile" className="grid gap-2 text-sm">
                <p>用户名：{detail.username}</p>
                <p>邮箱：{detail.email ?? "-"}（{detail.email_verified ? "已验证" : "未验证"}）</p>
                <p>手机号：{detail.phone ?? "-"}</p>
                <p>注册时间：{new Date(detail.register_at).toLocaleString("zh-CN")}</p>
                <p>最近登录：{detail.last_login_at ? new Date(detail.last_login_at).toLocaleString("zh-CN") : "-"}</p>
                <p>最近活跃：{detail.last_active_at ? new Date(detail.last_active_at).toLocaleString("zh-CN") : "-"}</p>
              </TabsPanel>
              <TabsPanel id="role" className="grid gap-4 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  {detail.roles.includes("ROLE_ADMIN") ? <Badge variant="brand">管理员</Badge> : null}
                  {detail.roles.includes("ROLE_VIP") ? <Badge variant="success">VIP</Badge> : null}
                  <Badge variant={detail.status === 1 ? "secondary" : "destructive"}>
                    {detail.status === 1 ? "账号正常" : "已禁用"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={detail.roles.includes("ROLE_VIP") ? "outline" : "default"}
                    isLoading={isMutating}
                    onPress={() =>
                      void withRefresh(detail.roles.includes("ROLE_VIP") ? revokeVip : grantVip)
                    }
                  >
                    {detail.roles.includes("ROLE_VIP") ? "取消 VIP" : "授予 VIP"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={detail.status === 1 ? "text-destructive hover:bg-destructive/10" : ""}
                    isLoading={isMutating}
                    onPress={() =>
                      void withRefresh(detail.status === 1 ? disableAccount : enableAccount)
                    }
                  >
                    {detail.status === 1 ? "禁用账号" : "启用账号"}
                  </Button>
                </div>
              </TabsPanel>
            </TabsPanels>
          </Tabs>
        )}
      </div>
    </Modal>
  );
}
```

（`Modal`/`Tabs` 的 `size`/`isOpen`/`onClose` 具体 prop 名以 `packages/ui/src/modal.tsx`、`packages/ui/src/tabs/tabs.tsx` 实际导出为准，实现前先读一遍这两个文件确认签名，若字段名不同就按实际改。）

- [ ] **Step 6: 在 `UsersPage.tsx` 接入**

```tsx
<UserDetailModal
  userId={selectedUserId ? Number(selectedUserId) : null}
  onClose={() => setSelectedUserId(null)}
  onChanged={() => void refetch()}
/>
```

- [ ] **Step 7: 写 `UserDetailModal.test.tsx`**

覆盖：`userId=null` 时不渲染内容（或 `isOpen=false`）；加载成功后显示用户名/邮箱；点击「授予 VIP」调用 `apiClient.users.grantVipRole` 并触发 `onChanged`；点击「禁用账号」调用 `apiClient.users.disableAccount`。Mock `apiClient` 参照 `writing-tests` skill 里 admin 模块的配方。

- [ ] **Step 8: 跑测试**

Run: `pnpm --filter admin test:run UserDetailModal.test.tsx UsersPage.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/admin/src/modules/users/hooks/use-user-detail.ts apps/admin/src/modules/users/hooks/use-user-detail.test.ts apps/admin/src/modules/users/components/UserDetailModal.tsx apps/admin/src/modules/users/components/UserDetailModal.test.tsx apps/admin/src/modules/users/UsersPage.tsx apps/admin/src/modules/users/UsersPage.test.tsx
git commit -m "feat(admin): 新增用户详情弹层，含基本信息与角色/账号 Tab"
```

---

### Task 15: 用户详情弹层——内容治理 Tab（迁移自审核模块）

**Files:**
- Create: `apps/admin/src/modules/users/hooks/use-user-moderation.ts`
- Create: `apps/admin/src/modules/users/hooks/use-user-moderation.test.ts`
- Create: `apps/admin/src/modules/users/components/UserModerationPanel.tsx`（从 `apps/admin/src/modules/moderation/components/ModerationUserPanel.tsx` 迁移改造）
- Create: `apps/admin/src/modules/users/components/UserModerationPanel.test.tsx`
- Modify: `apps/admin/src/modules/users/components/UserDetailModal.tsx`（加「内容治理」Tab）
- Modify: `apps/admin/src/modules/users/components/UserDetailModal.test.tsx`

**Interfaces:**
- Consumes：`apiClient.moderation.getUserProfile/updateUserProfile/muteUser/banUser/releaseUser/hideUserContent/restoreUserContent`（接口不变，只是调用方从 moderation 模块换到 users 模块）；沿用 `apps/admin/src/modules/moderation/components/ModerationUserBatchPanel.tsx`、`ModerationUserSummary.tsx`（直接复用，不复制，import 路径改成相对跨模块引用 `../../moderation/components/...`——若 lint 规则不允许跨模块引用私有组件，则把这两个文件移动到 `apps/admin/src/components/` 作为共享组件，本任务里先尝试直接引用，若 `pnpm lint` 报错再移动）。
- Produces：`useUserModeration(userId: number | null)`（去掉原 `use-moderation-user.ts` 里手动输入 ID 查询的部分，改为 `userId` 变化时自动加载）；`<UserModerationPanel userId={number} />`（无 ID 输入框）。

- [ ] **Step 1: 读现有 `use-moderation-user.ts` 确认可复用的部分**

Run: `cat apps/admin/src/modules/moderation/hooks/use-moderation-user.ts`

把其中 `loadProfile(userId)`、`updateProfile`、`muteUser`、`banUser`、`releaseUser`、`hideContentBatch`、`restoreContentBatch` 的实现逻辑原样搬到新文件，只删除「等待手动传入 userId」的部分，改为 hook 参数直接是 `userId: number | null`，`userId` 变化时 `useEffect` 自动调用一次 `loadProfile`。

- [ ] **Step 2: 写 `use-user-moderation.ts` 失败测试**

```ts
// apps/admin/src/modules/users/hooks/use-user-moderation.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "../../../lib/api";
import { useUserModeration } from "./use-user-moderation";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    moderation: {
      getUserProfile: vi.fn(),
      updateUserProfile: vi.fn(),
      muteUser: vi.fn(),
      banUser: vi.fn(),
      releaseUser: vi.fn(),
      hideUserContent: vi.fn(),
      restoreUserContent: vi.fn(),
    },
  },
}));

describe("useUserModeration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("userId 变化时自动加载画像", async () => {
    vi.mocked(apiClient.moderation.getUserProfile).mockResolvedValue({
      user_id: 7, trust_level: "normal", trust_source: "auto", manual_trust_locked: false,
      sanction_state: "active", clean_approval_streak: 0, corrected_count: 0,
      rejected_count: 0, high_risk_count: 0, violation_score: 0,
      created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    });

    const { result } = renderHook(() => useUserModeration(7));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(apiClient.moderation.getUserProfile).toHaveBeenCalledWith(7);
    expect(result.current.profile?.trust_level).toBe("normal");
  });
});
```

- [ ] **Step 3: 跑测试确认失败，然后实现 hook**

Run: `pnpm --filter admin test:run use-user-moderation.test.ts` → FAIL

实现（基于 Step 1 搬来的逻辑改写）：

```ts
// apps/admin/src/modules/users/hooks/use-user-moderation.ts
import { useCallback, useEffect, useState } from "react";
import { ApiError, type AdminModerationProfileResp, type ModerationTrustLevel } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";

export interface BatchState {
  isRunning: boolean;
  cursor?: string;
  processed: number;
}

export interface HideBatchReq {
  reason: string;
  cursor?: string;
  limit?: number;
}

export function useUserModeration(userId: number | null) {
  const [profile, setProfile] = useState<AdminModerationProfileResp | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [batch, setBatch] = useState<BatchState | null>(null);

  const loadProfile = useCallback(async () => {
    if (userId === null) {
      setProfile(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.moderation.getUserProfile(userId);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("加载审核画像失败"));
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const runSave = useCallback(
    async (action: () => Promise<unknown>, successMessage: string) => {
      setIsSaving(true);
      try {
        await action();
        addToast(successMessage, "success");
        await loadProfile();
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "操作失败，请稍后重试", "error");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [loadProfile],
  );

  const updateProfile = useCallback(
    async (req: { trust_level: ModerationTrustLevel; manual_locked: boolean; restricted_until?: string | null }) => {
      if (userId === null) return;
      await runSave(() => apiClient.moderation.updateUserProfile(userId, req), "已更新审核画像");
    },
    [userId, runSave],
  );

  const muteUser = useCallback(
    async (req: { reason: string; until?: string | null }) => {
      if (userId === null) return;
      await runSave(() => apiClient.moderation.muteUser(userId, req), "已禁言");
    },
    [userId, runSave],
  );

  const banUser = useCallback(
    async (req: { reason: string; until?: string | null }) => {
      if (userId === null) return;
      await runSave(() => apiClient.moderation.banUser(userId, req), "已封禁");
    },
    [userId, runSave],
  );

  const releaseUser = useCallback(async () => {
    if (userId === null) return;
    await runSave(() => apiClient.moderation.releaseUser(userId), "已解除处罚");
  }, [userId, runSave]);

  const hideContentBatch = useCallback(
    async (req: HideBatchReq) => {
      if (userId === null) return;
      setBatch({ isRunning: true, processed: 0 });
      try {
        const data = await apiClient.moderation.hideUserContent(userId, req);
        setBatch({ isRunning: false, cursor: data.next_cursor, processed: data.processed });
        addToast(`已隐藏 ${data.processed} 条内容`, "success");
      } catch (err) {
        setBatch(null);
        addToast(err instanceof ApiError ? err.message : "批量隐藏失败", "error");
      }
    },
    [userId],
  );

  const restoreContentBatch = useCallback(
    async (req: HideBatchReq) => {
      if (userId === null) return;
      setBatch({ isRunning: true, processed: 0 });
      try {
        const data = await apiClient.moderation.restoreUserContent(userId, req);
        setBatch({ isRunning: false, cursor: data.next_cursor, processed: data.processed });
        addToast(`已恢复 ${data.processed} 条内容`, "success");
      } catch (err) {
        setBatch(null);
        addToast(err instanceof ApiError ? err.message : "批量恢复失败", "error");
      }
    },
    [userId],
  );

  return {
    profile, isLoading, isSaving, error, batch,
    reload: loadProfile, updateProfile, muteUser, banUser, releaseUser,
    hideContentBatch, restoreContentBatch,
  };
}
```

> 实现前先读一遍 `apiClient.moderation.hideUserContent`/`restoreUserContent` 的真实返回类型（`AdminModerationEmergencyBatchResp`），把 `data.next_cursor`/`data.processed` 换成该类型实际字段名。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter admin test:run use-user-moderation.test.ts`
Expected: PASS

- [ ] **Step 5: 写 `UserModerationPanel.tsx`（基于 `ModerationUserPanel.tsx` 删掉 ID 输入框）**

复制 `ModerationUserPanel.tsx` 的表单渲染部分（信任等级 Select、受限到期 Input、手工锁定 checkbox、处罚理由/到期、禁言/封禁/解除按钮、`ModerationUserBatchPanel`），删除顶部「输入用户 ID + 查询画像/清除」那一段（第 122-148 行对应部分），组件签名改为：

```tsx
interface UserModerationPanelProps {
  userId: number;
}

export function UserModerationPanel({ userId }: UserModerationPanelProps) {
  const { profile, isLoading, isSaving, error, batch, updateProfile, muteUser, banUser, releaseUser, hideContentBatch, restoreContentBatch } =
    useUserModeration(userId);
  // ...其余表单 state 和 JSX 与 ModerationUserPanel 一致，只是去掉 profile/onLoadProfile/onResetProfile 相关的输入框与按钮
}
```

- [ ] **Step 6: 写 `UserModerationPanel.test.tsx`**

参照 `ModerationUserPanel.test.tsx` 的断言（信任等级选择、禁言/封禁按钮点击后调用对应方法），去掉「输入 ID 查询」相关的用例。

- [ ] **Step 7: 接入 `UserDetailModal.tsx`**

`TabsList` 加 `<TabsItem id="moderation">内容治理</TabsItem>`，`TabsPanels` 加：

```tsx
<TabsPanel id="moderation" className="overflow-y-auto">
  <UserModerationPanel userId={detail.id} />
</TabsPanel>
```

在 `UserDetailModal.tsx` 顶部补上 `import { UserModerationPanel } from "./UserModerationPanel";`。

- [ ] **Step 8: 跑测试**

Run: `pnpm --filter admin test:run use-user-moderation.test.ts UserModerationPanel.test.tsx UserDetailModal.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/admin/src/modules/users/hooks/use-user-moderation.ts apps/admin/src/modules/users/hooks/use-user-moderation.test.ts apps/admin/src/modules/users/components/UserModerationPanel.tsx apps/admin/src/modules/users/components/UserModerationPanel.test.tsx apps/admin/src/modules/users/components/UserDetailModal.tsx apps/admin/src/modules/users/components/UserDetailModal.test.tsx
git commit -m "feat(admin): 用户详情弹层新增内容治理 Tab，迁移自审核模块的用户治理面板"
```

---

### Task 16: 用户详情弹层——头像 Tab + 操作日志 Tab

**Files:**
- Modify: `apps/admin/src/modules/users/components/UserDetailModal.tsx`
- Modify: `apps/admin/src/modules/users/components/UserDetailModal.test.tsx`
- Create: `apps/admin/src/modules/users/hooks/use-user-operation-logs.ts`
- Create: `apps/admin/src/modules/users/hooks/use-user-operation-logs.test.ts`
- Create: `apps/admin/src/modules/users/components/UserOperationLogList.tsx`
- Create: `apps/admin/src/modules/users/components/UserOperationLogList.test.tsx`

**Interfaces:**
- Consumes：Task 13 的 `SingleUserAvatarTool`；Task 10 的 `apiClient.users.getOperationLogs`。
- Produces：`useUserOperationLogs(userId: number | null)` 返回 `{ items, total, page, setPage, isLoading, error }`；`<UserOperationLogList userId={number} />`。

- [ ] **Step 1: 写 `use-user-operation-logs.ts` 失败测试并实现（模式与 `use-user-detail.ts` 一致，仅数据源不同）**

```ts
// apps/admin/src/modules/users/hooks/use-user-operation-logs.ts
import { useCallback, useEffect, useState } from "react";
import type { AdminOperationLogItemResp } from "@repo/api";
import { apiClient } from "../../../lib/api";

const ACTION_LABELS: Record<string, string> = {
  grant_vip: "授予 VIP",
  revoke_vip: "取消 VIP",
  disable_account: "禁用账号",
  enable_account: "启用账号",
  mute: "禁言",
  ban: "封禁",
  release: "解除处罚",
  update_trust_level: "调整信任等级",
  clear_avatar: "清除头像",
};

export function getActionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

export function useUserOperationLogs(userId: number | null) {
  const [items, setItems] = useState<AdminOperationLogItemResp[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (userId === null) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    apiClient.users
      .getOperationLogs(userId, { page, page_size: 10 })
      .then((data) => {
        if (cancelled) return;
        setItems(data.list);
        setTotal(data.total);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载操作日志失败"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, page]);

  return { items, total, page, setPage, isLoading, error };
}
```

（测试文件 `use-user-operation-logs.test.ts` 结构参照 Task 14 Step 1，mock `apiClient.users.getOperationLogs`，断言 `page` 变化触发重新请求。）

- [ ] **Step 2: 写 `UserOperationLogList.tsx`**

```tsx
import { Pagination } from "@repo/ui";
import { getActionLabel, useUserOperationLogs } from "../hooks/use-user-operation-logs";

export function UserOperationLogList({ userId }: { userId: number }) {
  const { items, total, page, setPage, isLoading, error } = useUserOperationLogs(userId);
  const totalPages = Math.max(1, Math.ceil(total / 10));

  if (isLoading) return <p className="text-sm text-muted-foreground">加载中…</p>;
  if (error) return <p role="alert" className="text-sm text-destructive">{error.message}</p>;
  if (items.length === 0) return <p className="text-sm text-muted-foreground">暂无操作记录</p>;

  return (
    <div className="grid gap-3">
      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-md border border-border/70 px-3 py-2 text-sm">
            <span className="font-medium text-foreground">{getActionLabel(item.action)}</span>
            <span className="ml-2 text-muted-foreground">
              操作人 #{item.operator_id} · {new Date(item.created_at).toLocaleString("zh-CN")}
            </span>
          </li>
        ))}
      </ul>
      {totalPages > 1 ? <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} /> : null}
    </div>
  );
}
```

- [ ] **Step 3: 加到 `UserDetailModal.tsx`**

```tsx
<TabsItem id="avatar">头像</TabsItem>
<TabsItem id="logs">操作日志</TabsItem>
{/* ... */}
<TabsPanel id="avatar" className="overflow-y-auto">
  <SingleUserAvatarTool userId={detail.id} />
</TabsPanel>
<TabsPanel id="logs" className="overflow-y-auto">
  <UserOperationLogList userId={detail.id} />
</TabsPanel>
```

在 `UserDetailModal.tsx` 顶部补上这两个新组件的 import：

```tsx
import { SingleUserAvatarTool } from "./AvatarNormalizeTool";
import { UserOperationLogList } from "./UserOperationLogList";
```

- [ ] **Step 4: 跑全部详情弹层相关测试**

Run: `pnpm --filter admin test:run UserDetailModal.test.tsx UserOperationLogList.test.tsx use-user-operation-logs.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/modules/users/components/UserDetailModal.tsx apps/admin/src/modules/users/components/UserDetailModal.test.tsx apps/admin/src/modules/users/hooks/use-user-operation-logs.ts apps/admin/src/modules/users/hooks/use-user-operation-logs.test.ts apps/admin/src/modules/users/components/UserOperationLogList.tsx apps/admin/src/modules/users/components/UserOperationLogList.test.tsx
git commit -m "feat(admin): 用户详情弹层补齐头像与操作日志 Tab，5 个 Tab 全部完成"
```

---

### Task 17: `/users/tools` 全局头像批量处理页

**Files:**
- Create: `apps/admin/src/modules/users/UserToolsPage.tsx`
- Create: `apps/admin/src/modules/users/UserToolsPage.test.tsx`
- Modify: `apps/admin/src/modules/users/module.tsx`（追加无 nav 的子路由）
- Modify: `apps/admin/src/config/modules.test.ts`（若断言了路由总数，同步更新）

**Interfaces:**
- Consumes：Task 13 的 `AllUsersAvatarTool`。
- Produces：路由 `/users/tools`，从 `UsersPage.tsx`（Task 12 已加的「工具」按钮）跳转过来。

- [ ] **Step 1: 写页面**

```tsx
// apps/admin/src/modules/users/UserToolsPage.tsx
import { useNavigate } from "react-router";
import { Button } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
import { AdminListCard } from "../../components/AdminListCard";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AllUsersAvatarTool } from "./components/AvatarNormalizeTool";

export function UserToolsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-4">
      <AdminPageHeader
        title="用户工具"
        description="低频运维操作：全站头像归一化批量处理。"
        action={
          <Button size="sm" variant="ghost" onPress={() => navigate("/users")}>
            <SvgIcon name="arrow-left" size={15} />
            返回用户管理
          </Button>
        }
      />
      <AdminListCard className="p-4">
        <AllUsersAvatarTool />
      </AdminListCard>
    </div>
  );
}
```

（`arrow-left` 图标名需先确认存在，做法同 Task 12 Step 2 的图标核对方式。）

- [ ] **Step 2: 加路由**

在 `apps/admin/src/modules/users/module.tsx` 里追加一条无 `nav` 的路由项：

```tsx
import type { AdminModule } from "../../config/module-types";
import { UsersPage } from "./UsersPage";
import { UserToolsPage } from "./UserToolsPage";

export const usersModule: AdminModule = {
  id: "users",
  nav: {
    label: "用户",
    icon: "user",
    path: "/users",
    group: "内容",
    description: "管理注册用户、角色与账号状态",
  },
  routes: [
    { path: "/users", element: <UsersPage /> },
    { path: "/users/tools", element: <UserToolsPage /> },
  ],
};
```

- [ ] **Step 3: 写页面测试**

覆盖：渲染标题「用户工具」；渲染 `AllUsersAvatarTool` 的关键文案（如「处理全部」按钮）；点击「返回用户管理」调用 `navigate("/users")`（mock `react-router` 的 `useNavigate`，参照仓库里其它页面测试对 `useNavigate` 的 mock 方式，`grep -rn "useNavigate" apps/admin/src/modules/*/\*.test.tsx` 找一个现成例子抄写法）。

- [ ] **Step 4: 跑 `modules.test.ts` 确认约束不被破坏**

Run: `pnpm --filter admin test:run modules.test.ts UserToolsPage.test.tsx`
Expected: PASS（若失败提示路由重复或 index 冲突，检查 `/users/tools` 是否与其它模块路径冲突——应该不会，因为只有 `usersModule` 用这个前缀）

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/modules/users/UserToolsPage.tsx apps/admin/src/modules/users/UserToolsPage.test.tsx apps/admin/src/modules/users/module.tsx apps/admin/src/config/modules.test.ts
git commit -m "feat(admin): 新增 /users/tools 承载全局头像批量归一化，页面头部不再常驻该工具"
```

---

### Task 18: 删除审核模块的「用户治理」Tab

**Files:**
- Modify: `apps/admin/src/modules/moderation/ModerationPage.tsx`
- Modify: `apps/admin/src/modules/moderation/ModerationPage.test.tsx`
- Delete: `apps/admin/src/modules/moderation/components/ModerationUserPanel.tsx`
- Delete: `apps/admin/src/modules/moderation/components/ModerationUserPanel.test.tsx`
- Delete: `apps/admin/src/modules/moderation/hooks/use-moderation-user.ts`
- Delete: `apps/admin/src/modules/moderation/hooks/use-moderation-user.test.ts`
- Modify: `apps/admin/src/modules/moderation/components/ModerationUserSummary.tsx`（若 Task 15 决定跨模块直接引用则不动；若 lint 报错则移动到 `apps/admin/src/components/ModerationUserSummary.tsx` 并修正两处 import）
- Modify: `apps/admin/src/modules/moderation/components/ModerationUserBatchPanel.tsx`（同上）

**Interfaces:** 无新增；纯删除/收敛。

- [ ] **Step 1: 从 `ModerationPage.tsx` 移除「用户治理」Tab**

删除 `import { ModerationUserPanel } ...`、`import { useModerationUser } ...`、`const user = useModerationUser();`、`<TabsItem id="user">用户治理</TabsItem>`、对应的 `<TabsPanel id="user">...</TabsPanel>`，以及 `refreshTabData` 里的 `case "user": void user.reload(); break;` 分支。

- [ ] **Step 2: 更新 `ModerationPage.test.tsx`**

删除所有对「用户治理」Tab 的断言（切换到该 Tab、查询画像等用例），保留审核队列/全站控制/规则管理的测试不变。

- [ ] **Step 3: 删除废弃文件**

Run:
```bash
git rm apps/admin/src/modules/moderation/components/ModerationUserPanel.tsx apps/admin/src/modules/moderation/components/ModerationUserPanel.test.tsx apps/admin/src/modules/moderation/hooks/use-moderation-user.ts apps/admin/src/modules/moderation/hooks/use-moderation-user.test.ts
```

- [ ] **Step 4: 确认 `ModerationUserSummary`/`ModerationUserBatchPanel` 引用路径**

Run: `grep -rn "ModerationUserSummary\|ModerationUserBatchPanel" apps/admin/src`
Expected: 只有 Task 15 里 `UserModerationPanel.tsx` 一处引用（跨模块 import 或已移动到共享目录，取决于 Task 15 落地时的选择）。若还有 moderation 模块内部残留引用（不应该有，因为 `ModerationUserPanel.tsx` 已删除），需一并清理。

- [ ] **Step 5: 跑测试**

Run: `pnpm --filter admin test:run ModerationPage.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A apps/admin/src/modules/moderation
git commit -m "refactor(admin): 删除审核模块的用户治理 Tab，能力已整合进用户管理详情页"
```

---

### Task 19: 前端整体验证

**Files:** 无新文件，仅验证。

- [ ] **Step 1: 全量测试**

Run: `pnpm test:run`
Expected: PASS，无失败用例

- [ ] **Step 2: 类型检查**

Run: `pnpm -r typecheck` （若无此脚本，用 `pnpm --filter admin exec tsc --noEmit` 和 `pnpm --filter @repo/api exec tsc --noEmit`，先 `cat package.json` 确认实际脚本名）
Expected: 无类型错误

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: 无报错（重点关注 Task 15/18 的跨模块 import 是否触发 `eslint-plugin-boundaries` 之类的规则）

---

## 收尾：手动验证清单

实施完成后，用 `preview_start` 启动 `apps/admin` 开发服务器，人工走一遍：

1. 打开「用户管理」——顶部不再有头像归一化大块工具，页面一进来就是筛选工具栏+列表。
2. 搜索一个只在第 2 页的用户关键词——能直接搜到（验证不再是伪搜索）。
3. 切换角色筛选、账号状态筛选——列表联动刷新。
4. 点击任意用户「查看详情」——弹层打开，5 个 Tab 都能正常切换。
5. 在「角色与账号」Tab 里禁用一个非管理员账号，再启用——按钮状态和账号状态列联动更新。
6. 尝试禁用当前登录的管理员自己——应报错拒绝（若测试环境只有一个管理员，也应能验证「最后一个管理员」的拒绝文案）。
7. 在「内容治理」Tab 里对该用户禁言/封禁/解除——与原「内容审核」页效果一致。
8. 在「操作日志」Tab 里能看到刚才的禁用/启用/禁言/封禁记录。
9. 点击页头「工具」按钮跳到 `/users/tools`，能对全部用户跑一次头像归一化。
10. 打开「内容审核」页，确认「用户治理」Tab 已经消失，其余 Tab 不受影响。
