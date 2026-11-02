# Arquitectura TradeX

A TradeX começa como um modular monolith. O frontend é uma aplicação React/Vite independente; o backend é uma API REST Express com PostgreSQL e Prisma.

## Limites de camadas

- `presentation`: HTTP, validação, controladores e middleware.
- `application`: casos de uso, DTOs e contratos de integração.
- `domain`: entidades, serviços e interfaces sem dependência de Express ou Prisma.
- `infrastructure`: Prisma, repositórios e adaptadores de pagamento, logística, notificações e armazenamento.

## Regras de modelação

O estado da encomenda, o pagamento e a remessa são ciclos distintos. Um produto pode estar disponível localmente ou depender de aquisição internacional; esta decisão deve ser explícita ao implementar stock e procurement.

## Próximos módulos

1. Autenticação e clientes com RBAC.
2. Catálogo, produtos, categorias, variantes e carrinho.
3. Checkout, encomendas e pagamento por parceiro autorizado.
4. Compras, fornecedores, armazéns e logística.
5. Notificações, relatórios e backoffice.

