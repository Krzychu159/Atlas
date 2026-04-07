import {
  Bell,
  CircleQuestionMark,
  Search,
  CircleUserRound,
} from "lucide-react";

export function Header() {
  return (
    <header className="max-w-[1000px] mx-auto mt-4 mb-12  grid grid-cols-[1fr_auto] items-center ">
      <div className="flex justify-between border-r-2 border-surface-container pr-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search members, trainers, etc."
            className="min-w-lg pl-10 pr-6 py-3 text-sm rounded bg-surface-container-lowest focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-4 ml-16">
          <Bell width={18} height={18} />
          <CircleQuestionMark width={18} height={18} />
        </div>
      </div>
      <div className="flex px-4 gap-4">
        <div>
          <p className="text-label text-on-surface-muted">Full Name</p>
          <p className="text-xs text-on-surface">Role</p>
        </div>
        <CircleUserRound width={32} height={32} />
      </div>
    </header>
  );
}
