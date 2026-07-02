import { cn } from "@/lib/utils"

type AppImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "height" | "width"
> & {
  fill?: boolean
  priority?: boolean
  sizes?: string
}

export function AppImage({
  fill,
  className,
  priority: _priority,
  sizes: _sizes,
  ...props
}: AppImageProps) {
  return (
    <img
      {...props}
      className={cn(fill && "absolute inset-0 h-full w-full", className)}
    />
  )
}
