import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/pots/")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/pots/"!</div>
}
