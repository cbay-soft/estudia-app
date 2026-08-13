# GUIA DE DESPLIEGUE - EstudiA en Render.com (Gratis)

Tiempo estimado: 5-10 minutos. Sin tarjeta de credito necesaria.

---

## REQUISITOS PREVIOS

- Cuenta gratuita en GitHub: https://github.com
- Cuenta gratuita en Render.com: https://render.com
- Git instalado en tu computador

---

## PASO 1: Subir el proyecto a GitHub

### 1.1 Inicializar el repositorio

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
cd "c:\Users\Usuario\Documents\Ejercito\APPS\EstudiA"
git init
git add .
git commit -m "EstudiA v1.0 - App de estudio 4to EGB Ecuador"
```

### 1.2 Crear repositorio en GitHub

1. Ve a https://github.com/new
2. Nombre del repositorio: estudia-app
3. Visibilidad: Publico (requerido para el plan gratuito de Render)
4. NO marques ninguna opcion de inicializacion
5. Haz clic en "Create repository"

### 1.3 Conectar y subir

```bash
git remote add origin https://github.com/TU_USUARIO/estudia-app.git
git branch -M main
git push -u origin main
```

---

## PASO 2: Desplegar en Render.com

### 2.1 Crear cuenta y conectar GitHub

1. Ve a https://render.com y haz clic en "Get Started"
2. Registrate con tu cuenta de GitHub
3. Autoriza a Render a acceder a tus repositorios

### 2.2 Crear nuevo Web Service

1. En el Dashboard de Render, haz clic en "+ New" -> "Web Service"
2. Selecciona "Build and deploy from a Git repository"
3. Busca y selecciona "estudia-app" en la lista

### 2.3 Configurar el servicio

| Campo           | Valor                    |
|-----------------|--------------------------|
| Name            | estudia-app              |
| Region          | Oregon (US West)         |
| Branch          | main                     |
| Runtime         | Node                     |
| Build Command   | npm install              |
| Start Command   | node server.js           |
| Instance Type   | Free                     |

### 2.4 Variables de entorno

No son necesarias. El PORT lo maneja Render automaticamente.

### 2.5 Desplegar

Haz clic en "Create Web Service" y espera 2-3 minutos.

Cuando veas: "EstudiA server running on port 10000"
Tu app esta en linea!

---

## TU URL SERA ALGO COMO:

https://estudia-app.onrender.com

---

## CONSIDERACIONES DEL PLAN GRATUITO DE RENDER

| Caracteristica             | Plan Free                          |
|----------------------------|------------------------------------|
| Horas/mes                  | 750 horas (suficiente para 1 app)  |
| SSL / HTTPS                | Incluido gratis                    |
| Custom domain              | Posible                            |
| Sleep mode                 | Se "duerme" tras 15 min inactivo   |
| Tiempo de despertar        | 30-60 segundos primera visita      |

TIP: Para evitar el sleep, usa UptimeRobot (https://uptimerobot.com) gratis
que hace ping cada 5 minutos para mantener la app activa.

---

## ACTUALIZAR LA APP (cuando hagas cambios)

```bash
git add .
git commit -m "Descripcion de los cambios"
git push origin main
```

Render detecta automaticamente el nuevo push y redespliega en ~2 minutos.

---

## ESTRUCTURA DEL PROYECTO

```
EstudiA/
├── server.js          <- Servidor Express (minimo)
├── package.json       <- Dependencias del proyecto
├── Procfile           <- Instrucciones para Render
├── .gitignore         <- Archivos ignorados por Git
│
├── data/
│   └── 4to_egb.json   <- Toda la data de estudio (JSON)
│
└── public/
    ├── index.html     <- App principal
    ├── css/
    │   └── style.css  <- Estilos premium
    └── js/
        ├── storage.js  <- Manejo de localStorage
        ├── engine.js   <- Motor de preguntas + tolerancia tipeo
        ├── questions.js <- Renderizadores de tipos de preguntas
        └── app.js      <- Controlador principal de la app
```

---

## AGREGAR NIVELES FUTUROS

Para agregar por ejemplo 5to EGB:

1. Crea el archivo data/5to_egb.json con la misma estructura
2. En public/js/app.js, en el array LEVELS, cambia available: false a true
   para el 5to EGB y agrega file: '5to_egb.json'
3. Haz push y Render redesplegara automaticamente

---

## SOLUCION DE PROBLEMAS

### La app no carga datos
- Verifica que el archivo data/4to_egb.json este en el repositorio
- Revisa los logs en Render Dashboard -> tu servicio -> Logs

### Error "npm install fails"
- Asegurate de que package.json este en la raiz del proyecto

### La app se ve lenta al inicio
- Normal en el plan gratuito (sleep mode). Despues de la primera carga, sera rapida.

---

## FUNCIONALIDADES DE LA APP

| Funcion              | Descripcion                                      |
|----------------------|--------------------------------------------------|
| Modo Adaptativo      | Prioriza preguntas no vistas y errores           |
| Modo Facil           | Solo preguntas de nivel facil                    |
| Modo Intermedio      | Preguntas de dificultad media                    |
| Modo Dificil         | Maximo desafio                                   |
| Repasar Errores      | Repasa solo las preguntas que fallaste           |
| Por Materia          | Practica una materia especifica                  |
| Estadisticas         | Ve tu progreso por materia y global              |
| Tolerancia tipeo     | Acepta errores ortograficos menores              |
| Celebraciones        | Confetti y mensajes al acertar rachas            |

---

## MATERIAS INCLUIDAS - 4to EGB

| Materia               | Unidades | Tipos de ejercicio                              |
|-----------------------|----------|-------------------------------------------------|
| Lengua y Literatura   | 5        | Seleccion, completar, crucigrama, sopa, oracion |
| Matematica            | 6        | Seleccion, texto libre, unir                    |
| Ciencias Naturales    | 4        | Seleccion, unir, sopa de letras, crucigrama     |
| Estudios Sociales     | 4        | Seleccion, unir, completar                      |
| Ingles                | 2        | Unir, armar oraciones, completar                |

---

EstudiA v1.0 - Desarrollada para el curriculo del Ministerio de Educacion del Ecuador
