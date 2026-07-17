🗃️ Database Schema – Queen Broaster POS

## 📌 Propósito

Definir la estructura de la base de datos para gestionar:

* Profiles (profiles) / Usuarios
* Roles (roles) /Roles del Usuario par authenticación
* Tables (tables) / Mesas del Negocio
* Products (products) /Productos
* Categories (categories) /Categorias del Producto 
* Order (order) /Ordenes de las Mesas
* Order Items (order_items) /Items de las Ordenes de la Mesa
* Sales (sales) /Ventas Realizadas

Este esquema soporta múltiples clientes que presentan visualizaciones y clics constantes

---

# Entidades Principales

## profiles (Usuarios del sistema)

| Campo      | Tipo | Descripción            |
| ---------- | ---- | ---------------------- |
| id         | uuid | PK (Auth Supabase)     |
| full_name  | text | Nombre Usuario         |
| email      | text | Email del usuario      |
| avatar_url | text | Avatar                 |
| created_at | date | Fecha de creación      |
| updated_at | date | Fecha de Actualizacion |
| role_id    | int8 | FK → roles             |

---

## roles (Roles del Usuario)

| Campo      | Tipo | Descripción            |
| ---------- | ---- | ---------------------- |
| id         | uuid | PK (Auth Supabase)     |
| created_at | date | Fecha de creación      |
| name       | text | Nombre del Rol         |

---

## customer (clientes)


| Campo      | Tipo    | Descripción     |
| ---------- | ------- | --------------- |
| id         | int8    | PK              |
| full_name  | text    | Nombre Completo |
| nit        | text    | Identificación  |
| phone      | numeric | Teléfono        |
| address    | text    | Dirección       |
| created_at | date    | Fecha Creación  |


---

## tables (Mesas)

| Campo      | Tipo     | Descripción       |
| ---------- | -------- | ----------------- |
| id         | int8     | PK                |
| name       | text     | Nombre            |
| number     | numeric  | Numero            |
| created_at | date     | Fecha Creación    |
| status     | bool     | Estado de la Mesa |

---

## products (Productos)

| Campo       | Tipo     | Descripción         |
| ----------- | -------- | ------------------- |
| id          | int8     | PK                  |
| name        | text     | Nombre              |
| sku         | numeric  | Código              |
| created_at  | date     | Fecha Creación      |
| updated_at  | date     | Fecha Actualización |
| cost        | numeric  | Costo               |
| price       | numeric  | Precio              |
| description | text     | Descripción         |
| category_id | int8     | FK → categories     |
| stock       | numeric  | Inventario          |
| image_url   | text     | Url de la imagen    |
| cook        | bool     | Asignado a Cocina   |

---

## categories (Categorias de Productos)


| Campo      | Tipo | Descripción    |
| ---------- | ---- | -------------- |
| id         | int8 | PK             |
| name       | text | Nombre         |
| created_at | date | Fecha Creación |

---

## status_table (Estado de La Mesa)


| Campo      | Tipo | Descripción         |
| ---------- | ---- | ------------------- |
| id         | int8 | PK                  |
| name       | text | Nombre              |
| table_id   | int8 | FK → tables         |
| created_at | date | Fecha Creación      |
| updated_at | date | Fecha Actualización |

---

## order (Orden o Pedidos)


| Campo       | Tipo    | Descripción         |
| ----------- | ------- | ------------------- |
| id          | int8    | PK                  |
| table_id    | int8    | FK → tables         |
| user_id     | uuid    | Usuario asignado    |
| status      | int8    | FK  → status_tables |
| customer_id | int8    | FK  → customer      |
| created_at  | date    | Fecha Creación      |
| gps         | numeric | Usuario asignado    |
| updated_at  | date    | Fecha Actualización |

---

## order_items (Items de la Orden)


| Campo      | Tipo    | Descripción         |
| ---------- | ------- | ------------------- |
| id         | int8    | PK                  |
| order_id   | int8    | FK → order          |
| product_id | int8    | FK  → products      |
| price      | numeric | Precio              |
| notes      | text    | Notas               |
| status     | text    | Estado              |
| quantity   | numeric | Cantidad            |
| created_at | date    | Fecha Creación      |
| updated_at | date    | Fecha Actualización |

> Los complementos de cada ítem se guardan en la tabla intermedia `order_item_adds_on` (un ítem puede llevar varios complementos). Así la cocina muestra las adiciones de cada producto.

---

### adds-on (Catálogo de Adiciones y Complementos)


| Campo      | Tipo    | Descripción       |
| ---------- | ------- | ----------------- |
| id         | int8    | PK                |
| name       | text    | Nombre            |
| price      | numeric | Precio Adición    |
| created_at | date    | Fecha de Creación |


---

### order_item_adds_on (Complementos por Ítem de la Orden)

Relación muchos-a-muchos entre `order_items` y `adds-on`: cada ítem (producto) de la orden puede llevar varios complementos.

| Campo         | Tipo    | Descripción          |
| ------------- | ------- | -------------------- |
| id            | int8    | PK                   |
| order_item_id | int8    | FK → order_items     |
| adds_on_id    | int8    | FK → adds-on         |
| created_at    | date    | Fecha de Creación    |


---

## sales (Ventas)


| Campo          | Tipo    | Descripción       |
| -------------- | ------- | ----------------- |
| id             | int8    | PK                |
| order_id       | int8    | FK  → order       |
| subtotal       | numeric | Subtotal          |
| tax            | text    | Impuesto          |
| discount       | text    | Descuento         |
| total          | text    | Total             |
| payment_method | text    | Metodo de Pago    |
| created_at     | date    | Fecha de creación |

---

### invoice (Facturas)


| Campo          | Tipo | Descripción       |
| -------------- | ---- | ----------------- |
| id             | int8 | PK                |
| order_id       | int8 | FK  → order       |
| invoice_number | text | Numeración        |
| customer_id    | int8 | FK  → customer    |
| created_at     | date | Fecha de Creación |

---
