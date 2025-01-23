interface DifferenceBadgeProps {
  text: string;
}

const getBadgeColor = (text: string) => {
  switch (text.toLowerCase()) {
    case 'in sync':
      return 'bg-green-400/10 text-green-400 ring-green-400/20';
    case 'missing in production':
      return 'bg-red-400/10 text-red-400 ring-red-400/20';
    case 'missing in staging':
      return 'bg-yellow-400/10 text-yellow-400 ring-yellow-400/20';
    default:
      return 'bg-blue-400/10 text-blue-400 ring-blue-400/20';
  }
};

export function DifferenceBadge({ text }: Readonly<DifferenceBadgeProps>) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getBadgeColor(
        text
      )} mr-1 mb-1`}
    >
      {text}
    </span>
  );
}
