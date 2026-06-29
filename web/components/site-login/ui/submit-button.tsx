import { Button, type ButtonProps } from "./button";

/**
 * SubmitButton — full-width form action pill. Ported verbatim from iox-website
 * (src/components/ui/submit-button.tsx).
 */
export type SubmitButtonProps = Omit<ButtonProps, "type">;

export function SubmitButton({
  block = true,
  size = "md",
  children = "Submit",
  ...props
}: SubmitButtonProps) {
  return (
    <Button type="submit" block={block} size={size} {...props}>
      {children}
    </Button>
  );
}

export default SubmitButton;
