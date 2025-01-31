//Exportación de librerias necesarias
import express from 'express';
import session from 'express-session';
import { v4 as uuidv4 } from 'uuid'; // Generador de identificadores únicos
import os from 'os';

// Mapa para almacenar sesiones en memoria (RAM)
const sessions = new Map();

const app = express();
const PORT = 3000;

// Middleware para manejar solicitudes JSON y URL codificadas
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de sesiones almacenadas en memoria
app.use(
    session({
        secret: "Practica04-DBG#Gatico_SesionesHTTP-VariableDeSesion", // Clave secreta para cifrado de sesiones
        resave: false, // No vuelve a guardar sesiones sin cambios
        saveUninitialized: false, // No guarda sesiones sin inicializar
        cookie: { maxAge: 5 * 60 * 1000 } // Duración de la sesión en milisegundos (5 minutos)
    })
);

// Función para obtener la fecha y hora actual en la zona horaria de la CDMX
const getCDMXDateTime = () => {
    const date = new Date();
    const options = {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'short'
    };
    return date.toLocaleString('es-MX', options).replace(',', '').replace(/\//g, '-');
};

// Función para obtener la IP y MAC del servidor
const getServerInfo = () => {
    const networkInterfaces = os.networkInterfaces();
    let serverInfo = { ip: null, mac: null };

    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                serverInfo.ip = iface.address;
                serverInfo.mac = iface.mac;
                return serverInfo;
            }
        }
    }
    return serverInfo;
};

// Calcula el tiempo de inactividad en base a la última fecha de acceso
const calculateInactivityTime = (lastAccesed) => {
    try {
        const now = new Date();
        const [datePart, timePart] = lastAccesed.split(' ');
        const [day, month, year] = datePart.split('-');
        const [hours, minutes, seconds] = timePart.split(':');
        const lastAccess = new Date(year, month - 1, day, hours, minutes, seconds);
        const diff = now - lastAccess;

        if (isNaN(diff)) {
            throw new Error('Error en el cálculo de la fecha');
        }

        const totalSeconds = Math.floor(diff / 1000);
        const totalMinutes = Math.floor(totalSeconds / 60);
        const totalHours = Math.floor(totalMinutes / 60);

        return {
            hours: totalHours % 24,
            minutes: totalMinutes % 60,
            seconds: totalSeconds % 60,
            formatted: `${totalHours % 24}h ${totalMinutes % 60}m ${totalSeconds % 60}s`
        };
    } catch (error) {
        console.error('Error calculando tiempo de inactividad:', error);
        return { hours: 0, minutes: 0, seconds: 0, formatted: '0h 0m 0s' };
    }
};

// Obtiene la dirección IP del cliente
const getClientInfo = (req) => {
    let clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || '0.0.0.0';

    if (clientIP.includes('::ffff:')) {
        clientIP = clientIP.replace('::ffff:', '');
    }

    return { ip: clientIP };
};

// Rutas del API

// Ruta de bienvenida
app.get('/', (req, res) => {
    return res.status(200).json({ message: "Bienvenid@ al API de Control de Sesiones", author: "Brian Jesus Mendoza Marquez" });
});

// Ruta para iniciar sesión
app.post('/login', (req, res) => {
    const { email, nickname, macAddress } = req.body;

    if (!email || !nickname || !macAddress) {
        return res.status(400).json({ message: "Todos los campos son requeridos" });
    }

    const sessionId = uuidv4();
    const now = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });

    // Obtenemos información del cliente y servidor
    const clientInfo = getClientInfo(req);
    const serverInfo = getServerInfo();

    const sessionData = {
        sessionId,
        email,
        nickname,
        macAddress,
        createdAt: now,
        lastAccesed: now,
        clientInfo,
        serverInfo
    };

    sessions.set(sessionId, sessionData);
    req.session.userSession = sessionData;

    return res.status(200).json({
        message: "Inicio de sesión exitoso",
        sessionId,
        sessionData: {
            email: sessionData.email,
            nickname: sessionData.nickname,
            createdAt: sessionData.createdAt
        }
    });
});

// Ruta para cerrar sesión
app.post("/logout", (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(404).json({ message: "No se ha encontrado una sesión activa." });
    }
    sessions.delete(sessionId);
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Error al cerrar sesión' });
        }
        res.status(200).json({ message: "Logout exitoso" });
    });
});


app.put("/update", (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(404).json({ message: "No existe una sesión activa" });
    }

    const sessionData = sessions.get(sessionId);
    sessionData.lastAccesed = getCDMXDateTime();
    sessions.set(sessionId, sessionData);
    req.session.userSession = sessionData;

    res.status(200).json({ message: "Sesión actualizada correctamente", session: sessionData });
});

// Ruta para obtener el estado de la sesión
app.get("/status", (req, res) => {
    const { sessionId } = req.query;
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(404).json({ message: "Sesión no encontrada" });
    }

    const session = sessions.get(sessionId);
    session.inactivityDuration = calculateInactivityTime(session.lastAccesed);

    res.status(200).json({
        sessionId: session.sessionId,
        email: session.email,
        nickname: session.nickname,
        clientIP: session.clientInfo.ip,
        clientMAC: session.clientInfo.mac,
        serverIP: session.serverInfo.ip,
        serverMAC: session.serverInfo.mac,
        createdAt: session.createdAt,
        lastAccessed: session.lastAccesed,
        inactivityDuration: session.inactivityDuration.formatted,
    });
});

// Ruta para obtener todas las sesiones activas
app.get("/Sessions", (req, res) => {
    const activeSessions = Array.from(sessions.values()).map((session) => {
        const inactivity = calculateInactivityTime(session.lastAccesed);

        return {
            sessionId: session.sessionId,
            email: session.email,
            nickname: session.nickname,
            serverIP: session.serverInfo.ip,
            serverMAC: session.serverInfo.mac,
            createdAt: session.createdAt,
            lastAccesed: session.lastAccesed,
            inactivityDuration: inactivity.formatted,
        };
    });

    res.status(200).json(activeSessions);
});

// Servidor en escucha
app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
    console.log(`Información del servidor:`, getServerInfo());
});