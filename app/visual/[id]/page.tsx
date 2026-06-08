import VisualCanvasEditor from "@/components/VisualCanvasEditor";

type Props = { params: Promise<{ id: string }> };

export default async function VisualBoardPage({ params }: Props) {
  const { id } = await params;
  return <VisualCanvasEditor boardId={id} />;
}
