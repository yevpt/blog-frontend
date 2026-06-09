"use client";

import React, { useEffect, useRef } from "react";
import type { UserListItemResp } from "@repo/api";
import { BaseUserCard } from "@/components/common/base-user-card";

interface UserCardProps {
  user: UserListItemResp;
  index: number;
  animatedIds?: React.MutableRefObject<Set<string>>;
}

export function UserCard({ user, index, animatedIds }: UserCardProps) {
  const userId = String(user.id);
  const isNewRef = useRef(animatedIds ? !animatedIds.current.has(userId) : true);

  useEffect(() => {
    if (animatedIds) {
      animatedIds.current.add(userId);
    }
  }, [animatedIds, userId]);

  return (
    <BaseUserCard
      user={user}
      variant="normal"
      animateEnter={isNewRef.current}
      animationDelay={isNewRef.current && index < 40 ? `${index * 30}ms` : "0ms"}
    />
  );
}
