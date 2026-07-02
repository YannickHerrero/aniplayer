import { Link as RouterLink, type LinkProps } from "react-router-dom"

type AppLinkProps = Omit<LinkProps, "to"> & {
  href: LinkProps["to"]
}

export default function Link({ href, ...props }: AppLinkProps) {
  return <RouterLink to={href} {...props} />
}
