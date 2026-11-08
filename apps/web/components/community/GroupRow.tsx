import type { ReactNode } from "react";
import { Scene } from "@/components/ui/art";
import { sceneFor } from "@/lib/spots";

/** One group in a list: artwork, name, description, member count and an action. */
export function GroupRow({
  id,
  name,
  description,
  visibility,
  members,
  action,
}: {
  id: string;
  name: string;
  description: string;
  visibility: string;
  members: number;
  action: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3.5 rounded-[18px] bg-card p-3.5">
      <Scene kind={sceneFor(id)} className="size-16 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-semibold">{name}</p>
        {description && <p className="line-clamp-2 text-sm text-muted">{description}</p>}
        <p className="text-sm text-muted">
          {members} {members === 1 ? "member" : "members"} · {visibility === "private" ? "Private" : "Open"}
        </p>
      </div>
      {action}
    </li>
  );
}
