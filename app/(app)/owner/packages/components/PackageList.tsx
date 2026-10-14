import type { Package } from "@/app/lib/owner/packages";
import PackageListRow, { packageListGridStyle } from "./PackageListRow";

type PackageListProps = {
  packages: Package[];
  onDeleteRequest: (item: Package) => void;
};

export default function PackageList({ packages, onDeleteRequest }: PackageListProps) {
  return (
    <div className="bg-surface-container-lowest">
      <div
        className="hidden gap-3 bg-surface-container-low px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted lg:grid"
        style={packageListGridStyle}
      >
        <span>Pakiet</span>
        <span>Rodzaj</span>
        <span>Limit / czas</span>
        <span>Cena</span>
        <span>Status</span>
        <span className="text-right">Akcje</span>
      </div>

      <div className="flex flex-col gap-3 p-3 lg:block lg:p-0">
        {packages.map((item) => (
          <PackageListRow key={item.id} item={item} onDeleteRequest={onDeleteRequest} />
        ))}
      </div>
    </div>
  );
}
