# Descripción del Proyecto
App-web para un sistema POS para Queen Broaster, restaurante de pollos y comidas rápidas, con sistema de Mesas, Pedidos y Pedidos en Lista para la cocina, sistema moderno para el apoyo de esta gran herramienta ofrecer un buen servicio a los clientes

# Agents Rules
-   Cada función nueva debe incluir una linea con el nombre de la acción en Español.
-   Todas las variables y funciones deben escribirse en camelCase
-   No uses snake_case
-   la carpeta /docs con las información completa del proyecto
-   Los Diseños siempre deben adaptarse en movil y web /Responsive Design
-   Ideas de Diseños en la carpeta /ideas
-   Comandos de la terminal los realizo yo y después continua


### Arquitectura del Proyecto

src/
├── app/            # Routing (Next.js)
├── modules/        # Lógica por dominio
├── components/     # UI reutilizable
├── lib/            # Servicios y utilidades
├── store/          # Estado global
├── types/          # Tipos globales


##  Stack Tecnológico

- **Frontend**: Next.js - React
- **Backend**: Supabase (Auth, PostgreSQL, Storage)
- **PWA**: Workbox (configurado)