import { LeadsList } from './components/LeadsList'
import { ThemeToggle } from './components/ThemeToggle'

function App() {
  return (
    <div className="min-h-screen bg-muted/50 text-foreground">
      <header className="bg-card shadow-sm border-b border-border">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <a href="https://enginy.ai" target="_blank" className="flex items-center">
                <img
                  src="./favicon.svg"
                  className="h-8 w-8 transition-all duration-300 hover:drop-shadow-[0_0_2em_#646cffaa]"
                  alt="Enginy AI logo"
                />
                <h1 className="ml-3 text-xl font-semibold text-foreground">TinyEnginy</h1>
              </a>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <LeadsList />
      </main>
    </div>
  )
}

export default App
