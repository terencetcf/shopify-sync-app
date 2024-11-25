import { CompareDirection } from '../../types/sync';

interface DirectionSelectorProps {
  value: CompareDirection;
  onChange: (direction: CompareDirection) => void;
  isStagingToProductionEnabled: boolean;
}

export default function DirectionSelector({
  value,
  onChange,
  isStagingToProductionEnabled,
}: DirectionSelectorProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CompareDirection)}
        className="block rounded-md border-0 bg-gray-700 text-white py-1.5 pl-3 pr-10 text-gray-300 ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
      >
        <option value="production_to_staging">Production → Staging</option>
        <option value="staging_to_production">Staging → Production</option>
      </select>
      {!isStagingToProductionEnabled && value === 'staging_to_production' && (
        <div className="absolute left-0 -bottom-6 text-xs text-yellow-400">
          Note: Sync to Production is disabled
        </div>
      )}
    </div>
  );
}
