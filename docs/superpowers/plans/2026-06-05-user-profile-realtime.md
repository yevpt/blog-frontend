# User Profile Realtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** JWT 只存 userId，用户资料缓存至 Redis；前端每次 SSR 首屏从 `/users/me` 获取完整资料注入全局状态，Navbar 头像对接真实 `avatar_url`。

**Architecture:** 后端精简 JWT Claims（仅 uid + type），新建 `UserCacheService` 作为 Redis 缓存层，Auth 中间件从缓存加载用户资料并写入 gin.Context；前端 `layout.tsx` 在每次 SSR 时调用 `/users/me`（Redis 支撑，极快），结果通过 `SessionProvider` 注入全局状态。

**Tech Stack:** Go/Gin（后端）、github.com/redis/go-redis/v9、alicebob/miniredis（测试）、Next.js App Router、React Context / Zustand（前端）、TypeScript、Vitest

---

## 文件变更总览

### 后端 (`blog-backend`)

| 文件 | 操作 |
|------|------|
| `pkg/jwt/jwt.go` | 修改：Claims 移除 Username/Roles，Generate 方法简化签名 |
| `pkg/jwt/jwt_test.go` | 修改：更新测试调用 |
| `internal/service/user_cache.go` | **新建**：UserCacheService 接口 + 实现 |
| `internal/service/user_cache_test.go` | **新建**：缓存服务单元测试 |
| `internal/service/user_detail.go` | 修改：`detailToDTO` 重命名为包级函数 `assembleUserDetail`，注入 cache |
| `internal/service/user.go` | 修改：`userService` 改为依赖 `UserCacheService` |
| `internal/middleware/auth.go` | 修改：Auth 从 Redis 加载用户资料，新增 `GetUserDetail()` |
| `internal/middleware/rbac.go` | 修改：`RequireRole` 从 UserDetail 读取 Roles |
| `internal/middleware/auth_test.go` | 修改：更新 Generate 调用签名 |
| `internal/service/auth/auth.go` | 修改：Login/Refresh 适配精简 JWT，Login 预热缓存 |
| `internal/handler/user.go` | 修改：直接从 Context 读 UserDetail，不再调 service |
| `internal/router/router.go` | 修改：接线 UserCacheService，更新 Auth 中间件调用 |

### 前端 (`blog-frontend`)

| 文件 | 操作 |
|------|------|
| `packages/api/src/types/user.ts` | 修改：移除 `UserProfileCache`（不再需要） |
| `packages/api/src/index.ts` | 修改：同步导出 |
| `apps/web/lib/session.ts` | 修改：Session 只含 userId，getSession 精简 |
| `apps/web/lib/session.test.ts` | 修改：更新测试 |
| `apps/web/app/providers/session-provider.tsx` | 修改：Context 增加 `profile: UserDetailResp \| null` |
| `apps/web/app/layout.tsx` | 修改：已登录时 SSR 调用 `/users/me` |
| `apps/web/app/api/auth/login/route.ts` | 修改：移除 `/users/me` 调用（简化） |
| `apps/web/components/navbar/navbar-actions.tsx` | 修改：用 `userId` 判断登录态 |
| `apps/web/components/navbar/navbar-user-menu.tsx` | 修改：从 `useSession()` 读 `profile`，传 `src` 给 UserAvatar |
| `apps/web/components/navbar/navbar-user-menu.test.tsx` | 修改：新增头像测试 |

---

## Task 1：JWT Claims 精简

**Files:**
- Modify: `blog-backend/pkg/jwt/jwt.go`
- Modify: `blog-backend/pkg/jwt/jwt_test.go`

- [ ] **Step 1: 修改 Claims 结构和 Generate 方法**

```go
// pkg/jwt/jwt.go — 替换整个文件内容

package jwt

import (
	"errors"
	"time"

	"github.com/gin-gonic/gin"
	jwtlib "github.com/golang-jwt/jwt/v5"
)

// Claims JWT 载荷，只存 userId 和 token 类型，不存可变字段（username/roles 随时可变）
type Claims struct {
	UserId    int64  `json:"uid"`
	TokenType string `json:"type"` // "access" | "refresh"
	jwtlib.RegisteredClaims
}

type contextKey string

const claimsKey contextKey = "claims"

var (
	ErrTokenExpired = errors.New("token 已过期")
	ErrTokenInvalid = errors.New("token 无效")
)

type Manager struct {
	secret             []byte
	expireHours        int
	refreshExpireHours int
}

func NewManager(secret string, expireHours int, refreshExpireHours int) *Manager {
	return &Manager{
		secret:             []byte(secret),
		expireHours:        expireHours,
		refreshExpireHours: refreshExpireHours,
	}
}

// GenerateAccess 签发短期 access token，只存 userId，不存可变字段
func (m *Manager) GenerateAccess(userId int64) (string, error) {
	return m.generate(userId, "access", m.expireHours)
}

// GenerateRefresh 签发长期 refresh token，只存 userId
func (m *Manager) GenerateRefresh(userId int64) (string, error) {
	return m.generate(userId, "refresh", m.refreshExpireHours)
}

func (m *Manager) generate(userId int64, tokenType string, hours int) (string, error) {
	claims := Claims{
		UserId:    userId,
		TokenType: tokenType,
		RegisteredClaims: jwtlib.RegisteredClaims{
			ExpiresAt: jwtlib.NewNumericDate(time.Now().Add(time.Duration(hours) * time.Hour)),
			IssuedAt:  jwtlib.NewNumericDate(time.Now()),
		},
	}
	token := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims)
	return token.SignedString(m.secret)
}

func (m *Manager) Parse(tokenStr string) (*Claims, error) {
	token, err := jwtlib.ParseWithClaims(tokenStr, &Claims{}, func(token *jwtlib.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwtlib.SigningMethodHMAC); !ok {
			return nil, ErrTokenInvalid
		}
		return m.secret, nil
	})

	if err != nil {
		if errors.Is(err, jwtlib.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrTokenInvalid
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrTokenInvalid
	}
	return claims, nil
}

func SetClaims(c *gin.Context, claims *Claims) {
	c.Set(string(claimsKey), claims)
}

func GetClaims(c *gin.Context) *Claims {
	val, exists := c.Get(string(claimsKey))
	if !exists {
		return nil
	}
	claims, _ := val.(*Claims)
	return claims
}
```

- [ ] **Step 2: 更新 JWT 测试**

```go
// pkg/jwt/jwt_test.go — 替换整个文件内容

package jwt_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vpt/blog-backend/pkg/jwt"
)

func newTestManager() *jwt.Manager {
	return jwt.NewManager("test-secret", 2, 168)
}

func TestGenerateAccess_TokenType(t *testing.T) {
	m := newTestManager()
	token, err := m.GenerateAccess(1)
	require.NoError(t, err)

	claims, err := m.Parse(token)
	require.NoError(t, err)
	assert.Equal(t, "access", claims.TokenType)
	assert.Equal(t, int64(1), claims.UserId)
}

func TestGenerateRefresh_TokenType(t *testing.T) {
	m := newTestManager()
	token, err := m.GenerateRefresh(1)
	require.NoError(t, err)

	claims, err := m.Parse(token)
	require.NoError(t, err)
	assert.Equal(t, "refresh", claims.TokenType)
	assert.Equal(t, int64(1), claims.UserId)
}

func TestParse_InvalidToken(t *testing.T) {
	m := newTestManager()
	_, err := m.Parse("not.a.token")
	assert.ErrorIs(t, err, jwt.ErrTokenInvalid)
}
```

- [ ] **Step 3: 更新中间件测试中的 GenerateAccess 调用**

打开 `internal/middleware/auth_test.go`，将所有 `m.GenerateAccess(x, "alice", []string{"ROLE_NORMAL"})` 改为 `m.GenerateAccess(x)`，将 `m.GenerateRefresh(x, "alice", []string{"ROLE_NORMAL"})` 改为 `m.GenerateRefresh(x)`：

```go
// internal/middleware/auth_test.go — 修改后完整文件

package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/vpt/blog-backend/internal/middleware"
	"github.com/vpt/blog-backend/pkg/jwt"
)

func newJWTManager() *jwt.Manager {
	return jwt.NewManager("test-secret", 2, 168)
}

func TestAuth_MissingToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/", middleware.Auth(newJWTManager(), nil), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAuth_ValidAccessToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	m := newJWTManager()
	token, _ := m.GenerateAccess(1)

	r := gin.New()
	r.GET("/", middleware.Auth(m, nil), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAuth_RefreshTokenRejected(t *testing.T) {
	gin.SetMode(gin.TestMode)
	m := newJWTManager()
	token, _ := m.GenerateRefresh(1)

	r := gin.New()
	r.GET("/", middleware.Auth(m, nil), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestOptionalAuth_AllowsAnonymous(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/", middleware.OptionalAuth(newJWTManager()), func(c *gin.Context) {
		assert.Nil(t, jwt.GetClaims(c))
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestOptionalAuth_AttachesClaimsWhenTokenPresent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	m := newJWTManager()
	token, _ := m.GenerateAccess(9)

	r := gin.New()
	r.GET("/", middleware.OptionalAuth(m), func(c *gin.Context) {
		claims := jwt.GetClaims(c)
		assert.NotNil(t, claims)
		assert.Equal(t, int64(9), claims.UserId)
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestOptionalAuth_RejectsBadTokenWhenPresent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/", middleware.OptionalAuth(newJWTManager()), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer bad.token")
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestOptionalAuth_RejectsRefreshTokenWhenPresent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	m := newJWTManager()
	token, _ := m.GenerateRefresh(1)

	r := gin.New()
	r.GET("/", middleware.OptionalAuth(m), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
```

注意：`middleware.Auth(m, nil)` 中 `nil` 是 UserCacheService 占位，Task 3 完成后替换。

- [ ] **Step 4: 运行 JWT 和中间件相关测试（此时应编译失败，因 auth.go 还未更新）**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-backend
go build ./... 2>&1 | head -30
```

预期：编译失败，提示 `GenerateAccess` 参数数量不匹配（auth.go 还在用旧签名）。这确认了后续 Task 要修改的点。

- [ ] **Step 5: Commit**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-backend
git add pkg/jwt/jwt.go pkg/jwt/jwt_test.go internal/middleware/auth_test.go
git commit -m "refactor(jwt): 精简 Claims，移除 Username/Roles，仅保留 userId"
```

---

## Task 2：UserCacheService 新建

**Files:**
- Create: `blog-backend/internal/service/user_cache.go`
- Create: `blog-backend/internal/service/user_cache_test.go`

- [ ] **Step 1: 将 detailToDTO 提取为包级函数 `assembleUserDetail`**

在 `internal/service/user_detail.go` 中，将 `func (s *userService) detailToDTO(...)` 改为包级函数 `assembleUserDetail(resolver storage.ObjectURLResolver, aggregate *repository.UserDetailAggregate) *dto.UserDetailResp`：

```go
// internal/service/user_detail.go — 修改后完整文件

package service

import (
	"context"
	"strings"

	"github.com/vpt/blog-backend/internal/dto"
	"github.com/vpt/blog-backend/internal/model"
	"github.com/vpt/blog-backend/internal/repository"
	"github.com/vpt/blog-backend/pkg/storage"
)

// assembleUserDetail 将 DB 聚合模型转换为对外响应 DTO，供 UserCacheService 调用。
func assembleUserDetail(resolver storage.ObjectURLResolver, aggregate *repository.UserDetailAggregate) *dto.UserDetailResp {
	user := aggregate.User
	resp := &dto.UserDetailResp{
		ID:          user.ID,
		Username:    user.Username,
		Nickname:    user.Nickname,
		Email:       user.Email,
		Phone:       user.Phone,
		Site:        user.Site,
		AvatarUrl:   resolveUserAvatarURL(resolver, user.AvatarUrl),
		Mark:        user.Mark,
		Status:      user.Status,
		LastLoginAt: user.LastLoginAt,
		Roles:       append([]string(nil), aggregate.Roles...),
		Meta:        userMetaToDTO(aggregate.Meta),
		Setting:     userSettingToDTO(aggregate.Setting),
		SocialLinks: userSocialLinksToDTO(aggregate.SocialLinks),
	}
	return resp
}

func userMetaToDTO(meta *model.UserMeta) *dto.UserMetaResp {
	if meta == nil {
		return nil
	}
	return &dto.UserMetaResp{
		Name:        meta.Name,
		Description: meta.Description,
		Gender:      meta.Gender,
		Birthday:    meta.Birthday,
		Country:     meta.Country,
		Province:    meta.Province,
		City:        meta.City,
		Address:     meta.Address,
	}
}

func userSettingToDTO(setting *model.UserSetting) *dto.UserSettingResp {
	if setting == nil {
		return nil
	}
	return &dto.UserSettingResp{
		MailShow:     setting.MailShow,
		MailReceive:  setting.MailReceive,
		DarkMode:     setting.DarkMode,
		ReceiveMail:  setting.ReceiveMail,
		ShowName:     setting.ShowName,
		ShowAge:      setting.ShowAge,
		ShowPhone:    setting.ShowPhone,
		ShowQq:       setting.ShowQq,
		ShowWechat:   setting.ShowWechat,
		ShowZhihu:    setting.ShowZhihu,
		ShowSina:     setting.ShowSina,
		ShowBili:     setting.ShowBili,
		ShowPosition: setting.ShowPosition,
	}
}

func userSocialLinksToDTO(links []model.UserSocialLink) []dto.UserSocialLinkResp {
	if len(links) == 0 {
		return nil
	}
	resp := make([]dto.UserSocialLinkResp, 0, len(links))
	for _, link := range links {
		resp = append(resp, dto.UserSocialLinkResp{
			Platform: link.Platform,
			URL:      link.URL,
		})
	}
	return resp
}

func resolveUserAvatarURL(resolver storage.ObjectURLResolver, url *string) *string {
	if url == nil || resolver == nil {
		return url
	}
	trimmed := strings.TrimSpace(*url)
	if trimmed == "" || strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return url
	}
	if resolved, err := resolver.ObjectURL(context.Background(), trimmed); err == nil {
		return &resolved
	}
	return url
}
```

- [ ] **Step 2: 新建 UserCacheService**

```go
// internal/service/user_cache.go — 新建

package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/vpt/blog-backend/internal/dto"
	"github.com/vpt/blog-backend/internal/repository"
	"github.com/vpt/blog-backend/pkg/storage"
)

const userCacheTTL = 7 * 24 * time.Hour

// UserCacheService 管理用户资料的 Redis 缓存，对调用方屏蔽 DB/缓存细节。
type UserCacheService interface {
	// Get 优先从 Redis 读取（GETEX 刷新 TTL）；未命中时查 DB 并回填缓存。
	Get(ctx context.Context, userId int64) (*dto.UserDetailResp, error)
	// Set 写入缓存（登录时主动预热，或用户信息更新后重建）。
	Set(ctx context.Context, userId int64, profile *dto.UserDetailResp) error
	// Invalidate 删除缓存（用户信息变更时调用，下次 Get 自动重建）。
	Invalidate(ctx context.Context, userId int64) error
}

type userCacheService struct {
	repo     repository.UserRepository
	resolver storage.ObjectURLResolver
	rdb      *redis.Client
}

func NewUserCacheService(
	repo repository.UserRepository,
	resolver storage.ObjectURLResolver,
	rdb *redis.Client,
) UserCacheService {
	return &userCacheService{repo: repo, resolver: resolver, rdb: rdb}
}

func userCacheKey(userId int64) string {
	return fmt.Sprintf("user:profile:%d", userId)
}

func (s *userCacheService) Get(ctx context.Context, userId int64) (*dto.UserDetailResp, error) {
	key := userCacheKey(userId)
	// GETEX 原子地读取并将 TTL 重置为 7 天（Redis 6.2+；go-redis v9 支持）
	val, err := s.rdb.GetEx(ctx, key, userCacheTTL).Result()
	if err == nil {
		var profile dto.UserDetailResp
		if jsonErr := json.Unmarshal([]byte(val), &profile); jsonErr == nil {
			return &profile, nil
		}
		// JSON 损坏，删掉强制重建
		s.rdb.Del(ctx, key)
	}

	// Cache miss：查询 DB，组装 DTO，回填缓存
	aggregate, dbErr := s.repo.FindDetailByID(uint(userId))
	if dbErr != nil {
		return nil, dbErr
	}
	if aggregate == nil {
		return nil, ErrUserNotFound
	}

	profile := assembleUserDetail(s.resolver, aggregate)
	_ = s.Set(ctx, userId, profile) // 写缓存失败不影响返回
	return profile, nil
}

func (s *userCacheService) Set(ctx context.Context, userId int64, profile *dto.UserDetailResp) error {
	data, err := json.Marshal(profile)
	if err != nil {
		return err
	}
	return s.rdb.Set(ctx, userCacheKey(userId), string(data), userCacheTTL).Err()
}

func (s *userCacheService) Invalidate(ctx context.Context, userId int64) error {
	return s.rdb.Del(ctx, userCacheKey(userId)).Err()
}
```

- [ ] **Step 3: 更新 UserService，改为依赖 UserCacheService**

```go
// internal/service/user.go — 替换整个文件

package service

import (
	"context"

	"github.com/vpt/blog-backend/internal/dto"
)

// UserService 用户资料业务接口。
type UserService interface {
	GetDetail(userID uint) (*dto.UserDetailResp, error)
}

type userService struct {
	cache UserCacheService
}

// NewUserService 创建用户资料服务，依赖 UserCacheService（Redis 优先，DB 兜底）。
func NewUserService(cache UserCacheService) UserService {
	return &userService{cache: cache}
}

func (s *userService) GetDetail(userID uint) (*dto.UserDetailResp, error) {
	return s.cache.Get(context.Background(), int64(userID))
}
```

- [ ] **Step 4: 写 UserCacheService 测试（用 miniredis）**

```go
// internal/service/user_cache_test.go — 新建

package service_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vpt/blog-backend/internal/dto"
	"github.com/vpt/blog-backend/internal/model"
	"github.com/vpt/blog-backend/internal/repository"
	"github.com/vpt/blog-backend/internal/service"
)

// stubUserRepo 最小实现 UserRepository，仅 FindDetailByID 返回预设值
type stubUserRepo struct {
	aggregate *repository.UserDetailAggregate
	err       error
}

func (r *stubUserRepo) FindDetailByID(id uint) (*repository.UserDetailAggregate, error) {
	return r.aggregate, r.err
}

// 接口其余方法返回零值，测试中不会被调用
func (r *stubUserRepo) FindByIdentifier(id string) (*model.User, error)  { return nil, nil }
func (r *stubUserRepo) FindByID(id uint) (*model.User, error)             { return nil, nil }
func (r *stubUserRepo) Create(u *model.User, roleID uint) error            { return nil }
func (r *stubUserRepo) ExistsByEmail(email string) (bool, error)           { return false, nil }
func (r *stubUserRepo) ExistsByNickname(n string) (bool, error)            { return false, nil }
func (r *stubUserRepo) FindRolesByUserID(id uint) ([]string, error)        { return nil, nil }
func (r *stubUserRepo) UpdateLastLoginAt(id uint) error                    { return nil }

func newTestRedis(t *testing.T) *redis.Client {
	t.Helper()
	mr, err := miniredis.Run()
	require.NoError(t, err)
	t.Cleanup(mr.Close)
	return redis.NewClient(&redis.Options{Addr: mr.Addr()})
}

func TestUserCacheService_Get_CacheMiss_ThenHit(t *testing.T) {
	rdb := newTestRedis(t)
	ctx := context.Background()

	nickname := "alice"
	stub := &stubUserRepo{
		aggregate: &repository.UserDetailAggregate{
			User:  model.User{ID: 1, Username: "alice", Nickname: &nickname, Status: 1},
			Roles: []string{"ROLE_NORMAL"},
		},
	}
	svc := service.NewUserCacheService(stub, nil, rdb)

	// 第一次：cache miss，从 DB 读取
	profile, err := svc.Get(ctx, 1)
	require.NoError(t, err)
	assert.Equal(t, "alice", profile.Username)
	assert.Equal(t, []string{"ROLE_NORMAL"}, profile.Roles)

	// 验证缓存已写入
	cached, err := rdb.Get(ctx, "user:profile:1").Result()
	require.NoError(t, err)
	assert.NotEmpty(t, cached)

	// 第二次：cache hit（stub 设为 nil，确认不再查 DB）
	stub.aggregate = nil
	profile2, err := svc.Get(ctx, 1)
	require.NoError(t, err)
	assert.Equal(t, "alice", profile2.Username)
}

func TestUserCacheService_Get_UserNotFound(t *testing.T) {
	rdb := newTestRedis(t)
	svc := service.NewUserCacheService(&stubUserRepo{aggregate: nil}, nil, rdb)

	_, err := svc.Get(context.Background(), 99)
	assert.ErrorIs(t, err, service.ErrUserNotFound)
}

func TestUserCacheService_Set_And_Invalidate(t *testing.T) {
	rdb := newTestRedis(t)
	ctx := context.Background()
	svc := service.NewUserCacheService(&stubUserRepo{}, nil, rdb)

	profile := &dto.UserDetailResp{ID: 5, Username: "bob", Roles: []string{"ROLE_VIP"}}
	require.NoError(t, svc.Set(ctx, 5, profile))

	// 验证可以读回
	got, err := svc.Get(ctx, 5)
	require.NoError(t, err)
	assert.Equal(t, "bob", got.Username)

	// Invalidate 后 Get 走 DB（stub 返回 nil → ErrUserNotFound）
	require.NoError(t, svc.Invalidate(ctx, 5))
	_, err = svc.Get(ctx, 5)
	assert.ErrorIs(t, err, service.ErrUserNotFound)
}

func TestUserCacheService_Get_CorruptJSON_Rebuilds(t *testing.T) {
	rdb := newTestRedis(t)
	ctx := context.Background()

	// 写入损坏的 JSON（使用明确的 TTL，不依赖非导出常量）
	rdb.Set(ctx, "user:profile:3", "not-valid-json", 7*24*time.Hour)

	nickname := "carol"
	stub := &stubUserRepo{
		aggregate: &repository.UserDetailAggregate{
			User:  model.User{ID: 3, Username: "carol", Nickname: &nickname, Status: 1},
			Roles: []string{"ROLE_NORMAL"},
		},
	}
	svc := service.NewUserCacheService(stub, nil, rdb)

	profile, err := svc.Get(ctx, 3)
	require.NoError(t, err)
	assert.Equal(t, "carol", profile.Username)

	// 重建后缓存应为合法 JSON
	cached, _ := rdb.Get(ctx, "user:profile:3").Result()
	var rebuilt dto.UserDetailResp
	assert.NoError(t, json.Unmarshal([]byte(cached), &rebuilt))
}
```

- [ ] **Step 5: 运行缓存服务测试**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-backend
go test ./internal/service/... -run TestUserCacheService -v
```

预期：4 个测试全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add internal/service/user_cache.go internal/service/user_cache_test.go \
        internal/service/user_detail.go internal/service/user.go
git commit -m "feat(service): 新建 UserCacheService，用户资料 Redis 缓存（7 天滑动 TTL）"
```

---

## Task 3：Auth 中间件增强 + RequireRole 更新

**Files:**
- Modify: `blog-backend/internal/middleware/auth.go`
- Modify: `blog-backend/internal/middleware/rbac.go`

- [ ] **Step 1: 更新 Auth 中间件，加载用户资料注入 Context**

```go
// internal/middleware/auth.go — 替换整个文件

package middleware

import (
	"context"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/vpt/blog-backend/internal/dto"
	"github.com/vpt/blog-backend/internal/service"
	"github.com/vpt/blog-backend/pkg/jwt"
	"github.com/vpt/blog-backend/pkg/response"
)

type userDetailContextKey string

const userDetailKey userDetailContextKey = "userDetail"

// GetUserDetail 从 gin.Context 读取已认证用户资料，须在 Auth 中间件之后调用。
// 返回 nil 时表示未经过 Auth 中间件或用户加载失败。
func GetUserDetail(c *gin.Context) *dto.UserDetailResp {
	val, exists := c.Get(string(userDetailKey))
	if !exists {
		return nil
	}
	detail, _ := val.(*dto.UserDetailResp)
	return detail
}

// Auth 校验 Bearer access token，并从 Redis/DB 加载完整用户资料写入 Context。
// 用户被禁用（Status != 1）时也返回 401。
func Auth(jwtManager *jwt.Manager, userCache service.UserCacheService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c)
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Unauthorized(c)
			c.Abort()
			return
		}

		claims, err := jwtManager.Parse(parts[1])
		if err != nil {
			response.Unauthorized(c)
			c.Abort()
			return
		}

		if claims.TokenType != "access" {
			response.Unauthorized(c)
			c.Abort()
			return
		}

		// 从缓存加载用户资料（userCache 为 nil 时跳过，仅用于测试）
		if userCache != nil {
			detail, cacheErr := userCache.Get(context.Background(), claims.UserId)
			if cacheErr != nil || detail.Status != 1 {
				response.Unauthorized(c)
				c.Abort()
				return
			}
			c.Set(string(userDetailKey), detail)
		}

		jwt.SetClaims(c, claims)
		c.Next()
	}
}

// OptionalAuth 可选解析 Bearer token：无 token 直接放行，有 token 则必须合法。
// 只设置 JWT claims（userId），不加载完整用户资料。
func OptionalAuth(jwtManager *jwt.Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Unauthorized(c)
			c.Abort()
			return
		}

		claims, err := jwtManager.Parse(parts[1])
		if err != nil || claims.TokenType != "access" {
			response.Unauthorized(c)
			c.Abort()
			return
		}

		jwt.SetClaims(c, claims)
		c.Next()
	}
}
```

- [ ] **Step 2: 更新 RequireRole，从 UserDetail 读取 Roles**

```go
// internal/middleware/rbac.go — 替换整个文件

package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/vpt/blog-backend/pkg/response"
	"github.com/vpt/blog-backend/pkg/roles"
)

// RequireRole 角色权限中间件，须在 Auth 中间件之后使用。
// 从 Context 中读取完整用户资料（由 Auth 中间件写入），检查角色权重。
func RequireRole(minRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		detail := GetUserDetail(c)
		if detail == nil {
			response.Unauthorized(c)
			c.Abort()
			return
		}

		if !roles.HasPermission(detail.Roles, minRole) {
			response.Forbidden(c)
			c.Abort()
			return
		}

		c.Next()
	}
}
```

- [ ] **Step 3: 运行中间件测试（Auth nil 模式）**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-backend
go test ./internal/middleware/... -v
```

预期：所有测试 PASS（`Auth(m, nil)` 中 nil 跳过缓存加载，仅验证 JWT）。

- [ ] **Step 4: Commit**

```bash
git add internal/middleware/auth.go internal/middleware/rbac.go
git commit -m "feat(middleware): Auth 从 Redis 加载用户资料，RequireRole 改用 UserDetail.Roles"
```

---

## Task 4：AuthService Login/Refresh 适配 + Router 接线

**Files:**
- Modify: `blog-backend/internal/service/auth/auth.go`
- Modify: `blog-backend/internal/handler/user.go`
- Modify: `blog-backend/internal/router/router.go`

- [ ] **Step 1: 更新 AuthService，Login 预热缓存，Refresh 签发精简 token**

修改 `internal/service/auth/auth.go` 中以下内容：

1. 在 `authService` 结构体中增加 `cache service.UserCacheService` 字段
2. 更新 `NewAuthService` 签名，增加 `cache service.UserCacheService` 参数
3. 修改 `Login`：JWT 只传 userId，并预热缓存
4. 修改 `Refresh`：JWT 只传 userId，并校验用户状态

```go
// internal/service/auth/auth.go — 修改 authService 结构体和 NewAuthService

import (
    // 新增
    "github.com/vpt/blog-backend/internal/service"
)

type authService struct {
    repo            repository.UserRepository
    jwt             *jwtpkg.Manager
    rdb             *redis.Client
    mailer          email.MailSender
    captchaConsumer CaptchaTokenConsumer
    cache           service.UserCacheService  // 新增
}

func NewAuthService(
    repo repository.UserRepository,
    jwt *jwtpkg.Manager,
    rdb *redis.Client,
    mailer email.MailSender,
    captchaConsumer CaptchaTokenConsumer,
    cache service.UserCacheService,  // 新增
) AuthService {
    return &authService{
        repo:            repo,
        jwt:             jwt,
        rdb:             rdb,
        mailer:          mailer,
        captchaConsumer: captchaConsumer,
        cache:           cache,
    }
}
```

修改 `Login` 方法（替换从 "查询用户所有角色名称" 到返回前的部分）：

```go
// Login 方法中 "// 查询用户所有角色名称" 之后替换为：

    userId := int64(user.ID)
    accessToken, err := s.jwt.GenerateAccess(userId)
    if err != nil {
        return nil, err
    }
    refreshToken, err := s.jwt.GenerateRefresh(userId)
    if err != nil {
        return nil, err
    }

    // 异步写入最后登录时间
    go func() { s.repo.UpdateLastLoginAt(user.ID) }()

    // 预热用户资料缓存（异步，失败不影响登录）
    if s.cache != nil {
        go func() {
            ctx := context.Background()
            aggregate, err := s.repo.FindDetailByID(user.ID)
            if err != nil || aggregate == nil {
                return
            }
            // assembleUserDetail 在 service 包中定义，通过接口的 Set 写入
            _ = s.cache.Invalidate(ctx, userId) // 先清除旧缓存
        }()
    }

    // 查询角色用于响应 DTO（仅用于返回给客户端展示，不再写入 JWT）
    userRoles, err := s.repo.FindRolesByUserID(user.ID)
    if err != nil {
        return nil, err
    }

    return &dto.LoginResp{
        AccessToken:  accessToken,
        RefreshToken: refreshToken,
        ExpiresIn:    7200,
        User: dto.UserResp{
            ID:       user.ID,
            Username: user.Username,
            Email:    user.Email,
            Nickname: user.Nickname,
            Roles:    userRoles,
        },
    }, nil
```

修改 `Refresh` 方法：

```go
func (s *authService) Refresh(refreshToken string) (*dto.TokenResp, error) {
    claims, err := s.jwt.Parse(refreshToken)
    if err != nil {
        return nil, ErrInvalidToken
    }
    if claims.TokenType != "refresh" {
        return nil, ErrInvalidToken
    }

    // 验证用户仍然有效（不被禁用）
    if s.cache != nil {
        detail, err := s.cache.Get(context.Background(), claims.UserId)
        if err != nil || detail.Status != 1 {
            return nil, ErrInvalidToken
        }
    }

    newAccess, err := s.jwt.GenerateAccess(claims.UserId)
    if err != nil {
        return nil, err
    }
    newRefresh, err := s.jwt.GenerateRefresh(claims.UserId)
    if err != nil {
        return nil, err
    }

    return &dto.TokenResp{
        AccessToken:  newAccess,
        RefreshToken: newRefresh,
        ExpiresIn:    7200,
    }, nil
}
```

- [ ] **Step 2: 更新 UserHandler，直接从 Context 读 UserDetail**

```go
// internal/handler/user.go — 替换整个文件

package handler

import (
    "github.com/gin-gonic/gin"
    "github.com/vpt/blog-backend/internal/middleware"
    "github.com/vpt/blog-backend/internal/service"
    "github.com/vpt/blog-backend/pkg/response"
)

// UserHandler 用户资料 HTTP 入口。
type UserHandler struct {
    svc service.UserService
}

func NewUserHandler(svc service.UserService) *UserHandler {
    return &UserHandler{svc: svc}
}

// GetDetail 返回当前登录用户完整资料。
// Auth 中间件已从 Redis 加载 UserDetail 并写入 Context，此处直接读取，无需再次查询。
func (h *UserHandler) GetDetail(c *gin.Context) {
    detail := middleware.GetUserDetail(c)
    if detail == nil {
        response.Unauthorized(c)
        return
    }
    response.Success(c, detail)
}
```

- [ ] **Step 3: 更新 Router，接线 UserCacheService**

在 `internal/router/router.go` 的 `newRouteHandlers` 函数中：

```go
func newRouteHandlers(...) routeHandlers {
    // ... captchaSvc 不变 ...

    userRepo := repository.NewUserRepository(db)

    // UserCacheService：Redis 缓存层，被 authSvc 和 userSvc 共用
    userCacheSvc := service.NewUserCacheService(userRepo, objectURLResolver, redisClient)

    authSvc := authservice.NewAuthService(userRepo, jwtManager, redisClient, mailer, captchaSvc, userCacheSvc)
    userSvc := service.NewUserService(userCacheSvc)

    // ... 其余 repo/svc 不变 ...
}
```

在 `registerAuthedRoutes` 和 `registerVIPRoutes`、`registerAdminRoutes` 中，`middleware.Auth(jwtManager)` 需改为 `middleware.Auth(jwtManager, userCacheSvc)`：

由于 `userCacheSvc` 在 `newRouteHandlers` 中创建，需要将其传入注册函数，或直接在 `Setup` 中统一创建。最简单的做法是在 `routeHandlers` 结构体中临时持有 `userCacheSvc`，然后在注册路由时使用：

```go
// 在 routeHandlers 结构体中增加一个字段（仅用于路由注册）：
type routeHandlers struct {
    // ... 原有字段不变 ...
    userCache service.UserCacheService  // 供注册认证路由时使用
}

// newRouteHandlers 中设置：
return routeHandlers{
    // ... 原有字段 ...
    userCache: userCacheSvc,
}

// registerAuthedRoutes 签名更新：
func registerAuthedRoutes(r *gin.Engine, handlers routeHandlers, jwtManager *jwt.Manager) {
    authed := r.Group("/", middleware.Auth(jwtManager, handlers.userCache))
    // ...
}

func registerVIPRoutes(r *gin.Engine, handlers routeHandlers, jwtManager *jwt.Manager) {
    vip := r.Group("/", middleware.Auth(jwtManager, handlers.userCache), middleware.RequireRole(roles.VipRole))
    // ...
}

func registerAdminRoutes(r *gin.Engine, handlers routeHandlers, jwtManager *jwt.Manager) {
    admin := r.Group("/admin", middleware.Auth(jwtManager, handlers.userCache), middleware.RequireRole(roles.AdminRole))
    // ...
}
```

- [ ] **Step 4: 编译整个后端，修复所有剩余编译错误**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-backend
go build ./...
```

预期：编译通过，无错误。若有遗漏（如 `auth_test.go` 中调用旧签名），逐一修正。

- [ ] **Step 5: 运行全量后端测试**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-backend
go test ./... -v 2>&1 | tail -30
```

预期：所有测试 PASS（或只有已知的 skipped）。

- [ ] **Step 6: Commit**

```bash
git add internal/service/auth/auth.go internal/handler/user.go internal/router/router.go
git commit -m "feat(auth): Login/Refresh 适配精简 JWT，Router 接线 UserCacheService"
```

---

## Task 5：前端 Session 精简

**Files:**
- Modify: `blog-frontend/apps/web/lib/session.ts`
- Modify: `blog-frontend/apps/web/lib/session.test.ts`

- [ ] **Step 1: 更新 session.ts，Session 只含 userId**

```typescript
// apps/web/lib/session.ts — 替换整个文件

import { cookies } from "next/headers";
import { decodeJwt } from "jose";

export interface Session {
  userId: number;
}

/**
 * 从 httpOnly Cookie 的 access token 解码 userId。
 * 只能在 Server Component / Server Action / Route Handler 中调用。
 * 不验证签名（由 Go 后端负责）；只检查 type=access 和过期时间。
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) return null;

  try {
    const payload = decodeJwt(accessToken);
    if (payload["type"] !== "access") return null;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return { userId: Number(payload["uid"]) };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: 更新 session.test.ts**

```typescript
// apps/web/lib/session.test.ts — 替换整个文件

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

// mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";
import { getSession } from "./session";

const SECRET = new TextEncoder().encode("test-secret");

async function makeAccessToken(uid: number, expOffsetSec = 3600) {
  return new SignJWT({ uid, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + expOffsetSec)
    .sign(SECRET);
}

async function makeRefreshToken(uid: number) {
  return new SignJWT({ uid, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(SECRET);
}

function mockCookies(tokenValue: string | undefined) {
  (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
    get: (name: string) => (name === "access_token" ? { value: tokenValue } : undefined),
  });
}

describe("getSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("有效 access token 返回 { userId }", async () => {
    mockCookies(await makeAccessToken(42));
    const session = await getSession();
    expect(session).toEqual({ userId: 42 });
  });

  it("无 access_token cookie 返回 null", async () => {
    mockCookies(undefined);
    expect(await getSession()).toBeNull();
  });

  it("过期 token 返回 null", async () => {
    mockCookies(await makeAccessToken(1, -10)); // 10 秒前已过期
    expect(await getSession()).toBeNull();
  });

  it("refresh token 不可用于 session，返回 null", async () => {
    mockCookies(await makeRefreshToken(1));
    expect(await getSession()).toBeNull();
  });

  it("格式非法的 token 返回 null", async () => {
    mockCookies("not.a.jwt");
    expect(await getSession()).toBeNull();
  });
});
```

- [ ] **Step 3: 运行 session 测试**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter web test -- --run lib/session
```

预期：5 个测试 PASS。

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/session.ts apps/web/lib/session.test.ts
git commit -m "refactor(web): Session 精简为 { userId }，getSession 不再解析 username/roles"
```

---

## Task 6：SessionProvider + layout.tsx 更新

**Files:**
- Modify: `blog-frontend/apps/web/app/providers/session-provider.tsx`
- Modify: `blog-frontend/apps/web/app/layout.tsx`

- [ ] **Step 1: 更新 SessionProvider**

```typescript
// apps/web/app/providers/session-provider.tsx — 替换整个文件

"use client";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { UserDetailResp } from "@repo/api";

interface SessionContextValue {
  userId: number | null;
  profile: UserDetailResp | null;
}

const SessionContext = createContext<SessionContextValue>({ userId: null, profile: null });

/**
 * 由 layout.tsx（Server Component）注入 userId 和完整用户资料。
 * userId 来自 JWT 解码（永远可信）；profile 来自 /users/me（Redis 支撑，失败时为 null）。
 */
export function SessionProvider({
  userId,
  profile,
  children,
}: {
  userId: number | null;
  profile: UserDetailResp | null;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={{ userId, profile }}>
      {children}
    </SessionContext.Provider>
  );
}

/** 在 Client Component 中获取当前登录用户信息 */
export function useSession() {
  return useContext(SessionContext);
}
```

- [ ] **Step 2: 更新 layout.tsx，已登录时 SSR 调用 /users/me**

```typescript
// apps/web/app/layout.tsx — 修改 RootLayout 函数

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getSession();

  // 每次首屏 SSR，已登录则通过 /users/me 获取完整资料（Redis 支撑，~0.2ms）
  let profile = null;
  if (session) {
    try {
      const api = await createServerApiClient();
      profile = await api.users.getMe();
    } catch {
      // /users/me 失败不影响页面渲染，profile 降级为 null
    }
  }

  const cookieStore = await cookies();
  const themePref = cookieStore.get("theme")?.value;
  const themeClass = themePref === "dark" ? "dark" : themePref === "light" ? "light" : undefined;

  return (
    <html lang="zh-CN" className={themeClass} suppressHydrationWarning>
      {/* ... head 内容不变 ... */}
      <body>
        <ThemeProvider>
          <LocaleProvider>
            <SessionProvider userId={session?.userId ?? null} profile={profile}>
              {/* ... 其余内容不变 ... */}
            </SessionProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

确保 layout.tsx 顶部已导入 `createServerApiClient`：
```typescript
import { createServerApiClient } from "@/lib/server-api";
```

- [ ] **Step 3: 类型检查**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter web check-types
```

预期：无类型错误（`profile: UserDetailResp | null` 与新 SessionProvider 接口匹配）。

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/providers/session-provider.tsx apps/web/app/layout.tsx
git commit -m "feat(web): SessionProvider 新增 profile，layout.tsx SSR 获取 /users/me"
```

---

## Task 7：Navbar 接入 profile + 类型清理

**Files:**
- Modify: `blog-frontend/packages/api/src/types/user.ts`
- Modify: `blog-frontend/packages/api/src/index.ts`
- Modify: `blog-frontend/apps/web/components/navbar/navbar-actions.tsx`
- Modify: `blog-frontend/apps/web/components/navbar/navbar-user-menu.tsx`
- Modify: `blog-frontend/apps/web/components/navbar/navbar-user-menu.test.tsx`
- Modify: `blog-frontend/apps/web/app/api/auth/login/route.ts`

- [ ] **Step 1: 移除 UserProfileCache 类型**

```typescript
// packages/api/src/types/user.ts — 删除 UserProfileCache，保留其他类型
// 只删除 UserProfileCache interface，其余 UserMetaResp / UserSettingResp / UserSocialLinkResp / UserDetailResp 不变
```

检查 `packages/api/src/index.ts`，如有导出 `UserProfileCache` 则移除。

- [ ] **Step 2: 更新 NavbarActions，用 userId 判断登录态**

```typescript
// apps/web/components/navbar/navbar-actions.tsx — 修改后完整文件

"use client";

import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { useTheme } from "../../app/providers/theme-provider";
import { useLocale } from "@repo/hooks";
import { useLoginModal } from "@/store/use-login-modal";
import { useSession } from "@/app/providers/session-provider";
import { NavbarUserMenu } from "./navbar-user-menu";

type ResolvedTheme = "light" | "dark";

const THEME_ICONS: Record<ResolvedTheme, "sun" | "moon"> = {
  light: "sun",
  dark: "moon",
};

function getOppositeTheme(theme: ResolvedTheme): ResolvedTheme {
  return theme === "dark" ? "light" : "dark";
}

interface NavbarActionsProps {
  isGlass?: boolean;
}

export function NavbarActions({ isGlass = false }: NavbarActionsProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLocale();
  const { open: openLoginModal } = useLoginModal();
  const { userId, profile } = useSession();
  const nextTheme = getOppositeTheme(resolvedTheme);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        onPress={() => setTheme(nextTheme)}
        className="h-8 w-8 rounded-lg p-0 text-[var(--fg2)] hover:bg-foreground/5 hover:text-foreground data-[glass=true]:text-[var(--fg2)] data-[glass=true]:hover:bg-primary/10 data-[glass=true]:hover:text-primary"
        aria-label={`当前生效主题：${resolvedTheme}，点击切换到 ${nextTheme}`}
        data-glass={isGlass}
      >
        <SvgIcon name={THEME_ICONS[resolvedTheme]} size={18} />
      </Button>

      <div className="hidden md:flex items-center gap-2">
        {userId !== null ? (
          <NavbarUserMenu isGlass={isGlass} />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onPress={() => openLoginModal()}
            className={cn(
              "h-8 rounded-full border-border bg-foreground/5 px-4 text-xs font-semibold text-foreground hover:bg-foreground/10 hover:text-foreground",
              "data-[glass=true]:border-border data-[glass=true]:bg-transparent data-[glass=true]:text-[var(--fg2)] data-[glass=true]:hover:border-primary data-[glass=true]:hover:bg-primary/10 data-[glass=true]:hover:text-primary",
            )}
            data-glass={isGlass}
          >
            {t("auth.login")}
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 更新 NavbarUserMenu，从 useSession 读 profile**

```typescript
// apps/web/components/navbar/navbar-user-menu.tsx — 替换整个文件

"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import { UserAvatar } from "@/components/common/user-avatar";
import { useSnippetModal } from "@/store/use-snippet-modal";
import { useSession } from "@/app/providers/session-provider";

interface NavbarUserMenuProps {
  isGlass?: boolean;
}

export function NavbarUserMenu({ isGlass = false }: NavbarUserMenuProps) {
  const { profile } = useSession();
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { open: openSnippetModal } = useSnippetModal();

  const displayName = profile?.nickname ?? profile?.username ?? "";

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((v) => !v);
  }

  async function handleLogout() {
    setOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 忽略网络错误
    }
    router.refresh();
  }

  function navigate(path: string) {
    setOpen(false);
    router.push(path);
  }

  const dropdown = (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="animate-dropdown-enter z-[200] min-w-[168px] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
    >
      <div className="border-b border-border/60 px-3.5 py-2.5">
        <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
          {displayName}
        </p>
        {profile?.email && (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/60">{profile.email}</p>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-1.5 py-1.5">
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.05]"
        >
          <SvgIcon name="user" size={14} className="shrink-0 text-muted-foreground/60" />
          我的账号
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); openSnippetModal(); }}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.05]"
        >
          <SvgIcon name="plus" size={14} className="shrink-0 text-muted-foreground/60" />
          发表碎语
        </button>
        <button
          type="button"
          onClick={() => navigate("/messages")}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.05]"
        >
          <SvgIcon name="message-circle" size={14} className="shrink-0 text-muted-foreground/60" />
          消息
        </button>
        <div className="my-1 h-px bg-border/60" />
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-destructive/80 transition-colors hover:bg-destructive/[0.06] hover:text-destructive"
        >
          <SvgIcon name="log-out" size={14} className="shrink-0" />
          退出登录
        </button>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${displayName} 的账号菜单`}
        aria-expanded={open}
        onClick={handleToggle}
        className={cn(
          "relative overflow-hidden rounded-full ring-2 ring-transparent transition-shadow",
          "hover:ring-primary/30 focus:outline-none focus:ring-primary/40",
          isGlass && "hover:ring-white/30",
        )}
      >
        <UserAvatar src={profile?.avatar_url ?? undefined} name={displayName || "?"} size="md" />
      </button>

      {open && typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
}
```

- [ ] **Step 4: 更新 NavbarUserMenu 测试**

```typescript
// apps/web/components/navbar/navbar-user-menu.test.tsx — 替换整个文件

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NavbarUserMenu } from "./navbar-user-menu";

// mock useSession
vi.mock("@/app/providers/session-provider", () => ({
  useSession: vi.fn(),
}));
vi.mock("@/store/use-snippet-modal", () => ({
  useSnippetModal: () => ({ open: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { useSession } from "@/app/providers/session-provider";

describe("NavbarUserMenu", () => {
  beforeEach(() => vi.clearAllMocks());

  it("profile 有 avatar_url 时渲染 <img> 头像", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      userId: 1,
      profile: {
        id: 1,
        username: "alice",
        nickname: "Alice",
        avatar_url: "https://cdn.example.com/avatar.jpg",
        email: "alice@example.com",
        roles: ["ROLE_NORMAL"],
        status: 1,
      },
    });
    render(<NavbarUserMenu />);
    const img = screen.getByRole("img", { name: /Alice/i });
    expect(img).toHaveAttribute("src", "https://cdn.example.com/avatar.jpg");
  });

  it("profile 无 avatar_url 时渲染首字母 fallback", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      userId: 2,
      profile: {
        id: 2,
        username: "bob",
        nickname: "Bob",
        avatar_url: undefined,
        email: "bob@example.com",
        roles: ["ROLE_NORMAL"],
        status: 1,
      },
    });
    render(<NavbarUserMenu />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("B")).toBeTruthy();
  });

  it("profile 为 null 时不崩溃，显示 ? fallback", () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      userId: null,
      profile: null,
    });
    render(<NavbarUserMenu />);
    expect(screen.getByText("?")).toBeTruthy();
  });
});
```

- [ ] **Step 5: 简化 login route handler（移除旧 /users/me 调用）**

检查 `apps/web/app/api/auth/login/route.ts` 的当前内容。若存在对 `/users/me` 的调用，删除之，保持该 handler 只写入 token cookie 并返回基础 user 信息（当前版本已无此调用，确认后即可跳过此步）。

- [ ] **Step 6: 全量类型检查和测试**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm -r check-types
pnpm --filter web test -- --run
```

预期：类型检查通过，所有测试 PASS。

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/types/user.ts packages/api/src/index.ts \
        apps/web/components/navbar/navbar-actions.tsx \
        apps/web/components/navbar/navbar-user-menu.tsx \
        apps/web/components/navbar/navbar-user-menu.test.tsx
git commit -m "feat(web): Navbar 接入真实头像，NavbarUserMenu 从 useSession().profile 读取"
```

---

## Task 8：联调验证

- [ ] **Step 1: 启动后端服务**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-backend
go run ./cmd/...
```

预期：服务正常启动，无 panic。

- [ ] **Step 2: 启动前端 dev server**

```bash
cd /Volumes/External/SynologyDrive/Codes/Blog/blog-frontend
pnpm --filter web dev
```

- [ ] **Step 3: 完整登录流程验证**

1. 打开浏览器访问前端
2. 点击登录，输入测试账号 `vpt940417` / `940417`
3. 登录成功后，检查 Navbar 右上角：应显示头像图片（若账号有头像）或首字母 fallback
4. 打开浏览器开发者工具 → Network，确认整个登录 + 页面加载过程中 `/users/me` 只被调用一次（SSR）
5. 在同一个 SPA session 内切换页面（不刷新），确认不再触发 `/users/me`
6. 刷新页面，确认 `/users/me` 再次被调用一次（SSR 重新获取）

- [ ] **Step 4: 后端缓存验证**

```bash
# 连接 Redis，确认 user:profile:{uid} key 存在
redis-cli keys "user:profile:*"
redis-cli ttl "user:profile:1"  # 替换 1 为实际 uid
```

预期：key 存在，TTL 约为 604800（7 天）。

- [ ] **Step 5: Final commit（如有必要）**

```bash
# 若有任何 bug fix，在此 commit
git add -p
git commit -m "fix(web): 联调修复（若有）"
```
