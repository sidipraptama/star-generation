import { Td, Th, Table } from "@/components/ui/table";
import { formatDate, formatDuration, formatRupiah } from "@/lib/format";

export type EarningLine = {
  lesson_id: string;
  lesson_start: string;
  minutes: number;
  tutor_rate: number;
  amount: number;
};

export function totalEarnings(lines: EarningLine[]) {
  return lines.reduce((total, line) => total + line.amount, 0);
}

export function EarningsTable({ lines }: { lines: EarningLine[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Lesson</Th>
          <Th>Duration</Th>
          <Th>Tutor rate</Th>
          <Th className="text-right">Earns</Th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <tr key={line.lesson_id}>
            <Td>{formatDate(line.lesson_start)}</Td>
            <Td>{formatDuration(line.minutes)}</Td>
            <Td>{formatRupiah(line.tutor_rate)} / hour</Td>
            <Td className="text-right">{formatRupiah(line.amount)}</Td>
          </tr>
        ))}
        <tr className="bg-cloud/30 font-semibold">
          <Td className="border-b-0">Total</Td>
          <Td className="border-b-0" />
          <Td className="border-b-0" />
          <Td className="border-b-0 text-right">{formatRupiah(totalEarnings(lines))}</Td>
        </tr>
      </tbody>
    </Table>
  );
}
