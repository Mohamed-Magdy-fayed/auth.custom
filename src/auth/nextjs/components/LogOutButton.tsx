"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react"
import { authMessage } from "@/auth/config"
import { Button } from "@/components/ui/button"
import { logOut } from "../actions"

type ButtonLikeProps = React.ComponentProps<typeof Button>

type LogOutButtonProps = {
  children?: ReactNode
} & Pick<ButtonLikeProps, "variant" | "size" | "className" | "disabled"> &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick">

export function LogOutButton({
  children,
  variant = "destructive",
  size,
  className,
  disabled,
  ...buttonProps
}: LogOutButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      onClick={async () => await logOut()}
      {...buttonProps}
    >
      {children ?? authMessage("auth.logOut", "Log Out")}
    </Button>
  )
}
