import {
  useLocation,
  useNavigate,
  useParams as useRouterParams,
} from "react-router-dom"

export function usePathname(): string {
  return useLocation().pathname
}

export function useRouter() {
  const navigate = useNavigate()
  return {
    push: navigate,
    replace: (to: string) => navigate(to, { replace: true }),
  }
}

export function useParams<T extends Record<string, string>>() {
  return useRouterParams() as T
}
