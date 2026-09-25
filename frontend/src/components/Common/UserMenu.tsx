import { Link as RouterLink } from "@tanstack/react-router"
import { LogOut, Settings } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useAuth from "@/hooks/useAuth"
import { getInitials } from "@/utils"

interface UserInfoProps {
  fullName?: string | null
  email?: string | null
}

function UserInfo({ fullName, email }: UserInfoProps) {
  return (
    <div className="flex w-full min-w-0 items-center gap-2.5">
      <Avatar className="size-8">
        <AvatarFallback className="bg-zinc-600 text-white">
          {getInitials(fullName || "User")}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col items-start">
        <p className="w-full truncate text-sm font-medium">{fullName}</p>
        <p className="w-full truncate text-xs text-muted-foreground">{email}</p>
      </div>
    </div>
  )
}

/**
 * "My profile" button in the top right of the header. Shows only an avatar
 * until opened; name and e-mail live inside the dropdown menu.
 */
export function UserMenu() {
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          data-testid="user-menu"
          aria-label="My profile"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-zinc-600 text-xs text-white">
              {getInitials(user?.full_name || "User")}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-56">
        <DropdownMenuLabel className="p-0 font-normal">
          <UserInfo fullName={user?.full_name} email={user?.email} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <RouterLink to="/settings">
          <DropdownMenuItem>
            <Settings />
            User Settings
          </DropdownMenuItem>
        </RouterLink>
        <DropdownMenuItem onClick={() => void logout()}>
          <LogOut />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
