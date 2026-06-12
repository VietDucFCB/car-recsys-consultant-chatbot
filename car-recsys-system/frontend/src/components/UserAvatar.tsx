/** Shared user avatar: Google picture if present, else a single consistent initial. */
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { User } from "@/lib/api";

const initialOf = (user?: Partial<User> | null) =>
  ((user?.full_name?.[0] || user?.username?.[0] || user?.email?.[0] || "U")).toUpperCase();

const UserAvatar = ({ user, className }: { user?: Partial<User> | null; className?: string }) => (
  <Avatar className={className ?? "h-8 w-8"}>
    {user?.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.full_name || user.username || "User"} /> : null}
    <AvatarFallback className="bg-primary text-primary-foreground font-bold">
      {initialOf(user)}
    </AvatarFallback>
  </Avatar>
);

export default UserAvatar;
