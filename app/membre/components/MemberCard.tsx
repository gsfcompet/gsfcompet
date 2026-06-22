"use client";

import FutMemberCard from "@/components/FutMemberCard";

export function MemberCard({ profile }: { profile: any }) {
  return (
    <div className="w-full self-start rounded-[28px] border border-yellow-700/30 bg-[#140711]/95 p-4 shadow-2xl shadow-black/50">
      <FutMemberCard profile={profile} {...profile} />
    </div>
  );
}
