export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t px-4 py-4 sm:px-6">
      <p className="text-sm text-muted-foreground">Vibeboard - {currentYear}</p>
    </footer>
  )
}
