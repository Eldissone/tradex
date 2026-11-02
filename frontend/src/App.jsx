import { api } from './services/api';

const capabilities = [
  ['Comércio global', 'Produtos internacionais com preços em Kwanza.'],
  ['Logística visível', 'Acompanhe cada etapa, da China até Angola.'],
  ['Gestão integrada', 'Compras, encomendas, pagamentos e operações num só lugar.'],
];

export default function App() {
  return (
    <main>
      <nav className="nav" aria-label="Navegação principal">
        <a className="brand" href="#inicio">TRADEX<span>GLOBAL</span></a>
        <div className="nav-links"><a href="#servicos">Serviços</a><a href="#como-funciona">Como funciona</a><a href="#contacto">Contacto</a></div>
      </nav>
      <section id="inicio" className="hero">
        <p className="eyebrow">CHINA — ANGOLA</p>
        <h1>O seu acesso ao comércio global.</h1>
        <p className="lead">Uma plataforma para descobrir produtos, gerir importações e acompanhar entregas com total transparência.</p>
        <div className="actions"><button type="button">Explorar produtos</button><a href="#como-funciona">Como funciona</a></div>
      </section>
      <section id="servicos" className="capabilities" aria-label="Serviços TradeX">
        {capabilities.map(([title, copy]) => <article key={title}><h2>{title}</h2><p>{copy}</p></article>)}
      </section>
      <section id="como-funciona" className="process"><p className="eyebrow">PROCESSO SIMPLES</p><h2>Da escolha à entrega, tudo acompanhado.</h2><ol><li>Escolha os produtos</li><li>Pague em AOA</li><li>Acompanhe a sua encomenda</li></ol></section>
      <footer id="contacto"><span>TradeX Global Trading</span><span>Your Gateway to Global Commerce.</span></footer>
    </main>
  );
}

void api.health();

