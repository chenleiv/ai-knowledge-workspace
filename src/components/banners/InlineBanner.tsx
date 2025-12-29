type Props = {
  type?: "error" | "info";
  children: React.ReactNode;
};

export default function InlineBanner({ type = "info", children }: Props) {
  return <div className={`inline-banner ${type}`}>{children}</div>;
}
