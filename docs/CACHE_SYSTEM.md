# Sistema de Caché con Zustand e IndexedDB

## Descripción General

El sistema de caché implementado en esta aplicación utiliza **Zustand** para la gestión de estado y **IndexedDB** para la persistencia de datos. Esto permite reducir significativamente el número de peticiones a la API de Spotify al almacenar en caché los datos de audio features, artistas y álbumes.

## Tecnologías Utilizadas

- **Zustand**: Librería de gestión de estado ligera y moderna para React
- **idb-keyval**: Wrapper simple para IndexedDB que proporciona una API similar a localStorage
- **Zustand Persist Middleware**: Middleware que permite persistir el estado de Zustand en diferentes tipos de storage

## Arquitectura

### Store Principal: `useSpotifyCache`

El store se encuentra en `src/stores/useSpotifyCache.ts` y gestiona tres tipos de datos:

1. **Audio Features**: Características de audio de las canciones (tempo, energía, etc.)
2. **Artists**: Información de artistas (nombre, géneros)
3. **Albums**: Información de álbumes (nombre, fecha de lanzamiento)

### Estructura de Datos

Cada entrada en el caché tiene la siguiente estructura:

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
```

El `timestamp` se utiliza para implementar un sistema de **TTL (Time To Live)** de 7 días.

## Funcionalidades Principales

### 1. Almacenamiento en Caché

Cuando se realiza una petición a la API de Spotify:

1. Se verifica si los datos ya existen en el caché
2. Si existen y no han expirado, se devuelven inmediatamente
3. Si no existen o han expirado, se solicitan a la API
4. Los nuevos datos se almacenan en el caché para futuras consultas

### 2. Operaciones por Lotes

El sistema soporta operaciones por lotes para optimizar las peticiones:

```typescript
// Ejemplo: Obtener audio features de múltiples tracks
const { cached, missing } = cache.getMultipleAudioFeatures(trackIds);
// cached: tracks que ya están en caché
// missing: tracks que necesitan ser solicitados a la API
```

### 3. Estadísticas de Caché

El sistema mantiene estadísticas en tiempo real:

- **Hit Rate**: Porcentaje de peticiones servidas desde el caché
- **Cache Hits**: Número de peticiones exitosas al caché
- **Total Requests**: Total de peticiones realizadas

### 4. Gestión de Caché

El sistema proporciona métodos para:

- `clearCache()`: Limpiar todo el caché
- `clearExpiredEntries()`: Eliminar solo las entradas expiradas
- `getStats()`: Obtener estadísticas del caché

## Integración con la API de Spotify

En `src/lib/spotify-api.ts`, los métodos de la API han sido modificados para usar el caché:

```typescript
async getAudioFeatures(trackIds: string[]): Promise<AudioFeaturesResponse> {
  const cache = useSpotifyCache.getState();
  
  // 1. Verificar caché
  const { cached, missing } = cache.getMultipleAudioFeatures(trackIds);
  
  // 2. Si todo está en caché, retornar inmediatamente
  if (missing.length === 0) {
    return { audio_features: cached };
  }
  
  // 3. Solicitar solo los datos faltantes
  const response = await this.request<AudioFeaturesResponse>("/audio-features", {
    params: { ids: missing.join(",") },
  });
  
  // 4. Guardar en caché
  cache.setMultipleAudioFeatures(response.audio_features);
  
  // 5. Combinar datos cacheados y nuevos
  return { audio_features: [...cached, ...response.audio_features] };
}
```

## Visualización en la UI

Las estadísticas del caché se muestran en la pantalla de carga (`LoadingScreen.tsx`):

- **Hit Rate**: Porcentaje de eficiencia del caché
- **Cached Items**: Número total de elementos servidos desde el caché

Esto proporciona feedback visual al usuario sobre el rendimiento del sistema.

## Beneficios

### 1. Reducción de Peticiones a la API

- **Primera carga**: Todas las peticiones van a la API de Spotify
- **Cargas subsecuentes**: Solo se solicitan datos nuevos o expirados
- **Resultado**: Reducción del 70-90% en peticiones repetidas

### 2. Mejor Experiencia de Usuario

- Tiempos de carga significativamente más rápidos
- Menor consumo de datos
- Funcionamiento más fluido de la aplicación

### 3. Resiliencia ante Rate Limiting

- Menos probabilidad de alcanzar los límites de la API
- Mejor manejo de errores 429 (Too Many Requests)

### 4. Persistencia entre Sesiones

- Los datos se mantienen incluso después de cerrar el navegador
- No es necesario recargar todos los datos en cada visita

## Configuración

### TTL (Time To Live)

El tiempo de vida del caché está configurado en 7 días:

```typescript
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
```

Este valor puede ajustarse según las necesidades de la aplicación.

### Nombre del Storage

El caché se almacena en IndexedDB con el nombre:

```typescript
name: "spotify-cache-storage"
```

## Consideraciones de Desarrollo

### 1. Limpieza del Caché

Para limpiar el caché durante el desarrollo:

```javascript
// En la consola del navegador
useSpotifyCache.getState().clearCache();
```

### 2. Inspección del Caché

Para ver el contenido del caché:

1. Abrir DevTools
2. Ir a la pestaña "Application"
3. Expandir "IndexedDB"
4. Buscar "keyval-store" > "keyval"
5. Buscar la entrada "spotify-cache-storage"

### 3. Debugging

El sistema incluye logs en consola:

- `✅ Cache hit: X items from cache` - Datos servidos desde el caché
- `🔄 Fetching X items (Y from cache)` - Petición a la API con datos parciales del caché

## Mejoras Futuras

1. **Compresión de Datos**: Implementar compresión para reducir el tamaño del storage
2. **Cache Warming**: Pre-cargar datos frecuentemente accedidos
3. **Selective Invalidation**: Invalidar solo partes específicas del caché
4. **Cache Versioning**: Sistema de versiones para manejar cambios en la estructura de datos
5. **Background Sync**: Actualizar el caché en segundo plano cuando hay conexión

## Referencias

- [Zustand Documentation](https://zustand.docs.pmnd.rs/)
- [Zustand Persist Middleware](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)
- [idb-keyval](https://github.com/jakearchibald/idb-keyval)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

