type SystemMessageProps = {
  message: {
    id?: string;
    text: string;
    timestamp?: number;
  };
};

export default function SystemMessage({ message }: SystemMessageProps) {
  return (
    <div className="text-center py-1">
      <p className="text-xs text-muted-foreground italic">{message.text}</p>
    </div>
  );
}
