# System Architecture & Roadmap

## 1. Current Infrastructure (Sidecar Pattern)

The system follows a **Hexagonal Architecture** with a **Sidecar Deployment** model. The Elixir Gateway acts as the entry point, treating the TypeScript service as a domain adapter for "AI Logic" running in a separate container within the same Pod.

### High-Level Topology

```mermaid
graph TD
    User((User)) -->|HTTPS/WebSocket| Ingress[K8s Ingress]
    Ingress --> Service[K8s Service]
    
    subgraph Pod [App Pod]
        direction TB
        subgraph ContainerA [Elixir Container]
            Controller[Phoenix Controller/LiveView]
            Generator[Backend.Generator]
            Client[Backend.Gemini.Client]
        end
        
        subgraph ContainerB [TypeScript Sidecar]
            Server[Express Server :4001]
            Domain[GeminiBuilder / Domain Logic]
        end
        
        Controller -->|Calls| Generator
        Generator -->|Delegates| Client
        Client -->|HTTP POST localhost:4001| Server
        Server -->|Calls| Domain
    end
    
    Domain -->|HTTPS| Google[Google Gemini API]
```

### Component Roles

| Component | Role | Responsibility |
| :--- | :--- | :--- |
| **Phoenix Backend** | **Gateway & Orchestrator** | Manages user connections (WebSockets), authentication, and high-concurrency request handling. Acts as the "Port" for the application. |
| **TS Sidecar** | **Domain Logic** | Encapsulates prompt engineering, history management, and specific AI interactions. It is the "Adapter" implementation for intelligence. |
| **Google API** | **External Provider** | The raw model provider. Accessed only via the TS Sidecar. |

---

---

## 3. Target Architecture (Microservices & Polyglot)

To support multiple consumers (Elixir, Golang) and centralized domain logic, we will evolve from Sidecars to a **Centralized Microservice** architecture.

### Target Topology (Istio/gRPC)

```mermaid
graph TD
    subgraph Clients [Consumers]
        Elixir[Elixir Backend]
        Go[Golang Service]
    end

    subgraph ServiceMesh [Istio / K8s]
        LB[gRPC Load Balancer]
        
        subgraph DomainService [TS Domain Service]
            Pod1[TS Pod - Replica 1]
            Pod2[TS Pod - Replica 2]
            Pod3[TS Pod - Replica 3]
        end
    end
    
    Elixir -->|gRPC/Protobuf| LB
    Go -->|gRPC/Protobuf| LB
    LB -->|Round Robin| Pod1
    LB -->|Round Robin| Pod2
    LB -->|Round Robin| Pod3
    
    Pod1 -->|HTTPS| Google[Google Gemini API]
```

### Infrastructure Decisions
1.  **Monorepo Strategy (Nx)**:
    *   All services (Elixir, TS, Go) and the Shared Libs (`.proto`) will be managed in a single **Nx Monorepo**.
    *   *Benefit*: Atomic commits for `.proto` changes and their generated code in all languages.
2.  **Service Communication**:
    *   **Protocol**: gRPC (Protobuf) for type-safe, high-performance internal calls.
    *   **Routing**: Istio (or similar Service Mesh) to handle gRPC Load Balancing (L7) and "Emit vs Broadcast" patterns.
    *   *Goal*: Elixir & Go clients treat the TS Service as a "Virtual IP", while Istio handles the complex long-lived connection balancing.

---

## 4. Consolidated Roadmap

### Phase 1: Foundation (Current)
- [x] Establish Sidecar Pattern (Elixir -> TS).
- [ ] Stabilize HTTP Interface.

### Phase 2: Standardization (Critical)
- [ ] **Adopt Nx**: Restructure repo to host Elixir, TS, and future Go apps.
- [ ] **Define gRPC Contracts**: Create `packages/protos` with `gemini.proto`.
- [ ] **Implement gRPC**:
    -   Migrate TS Sidecar to a gRPC Server.
    -   Generate Elixir client stubs.

### Phase 3: Scaling & Polyglot
- [ ] **Deploy Centralized Service**: Move TS out of the Pod into a standalone Deployment.
- [ ] **Add Golang Service**: Create the new Go client consuming the same gRPC contract.
    -   L2: Distributed Redis (Write-Through).

---

## 5. Risks & Prototype Assumptions

Since we are prototyping a high-scale architecture ("Google Scale"), we accept specific trade-offs:

### Accepted Complexity
*   **The Triangle of Pain**: Changing a domain field requires updates in 3 places (Proto, Server, Client).
*   **Network Fallacy**: We assume low-latency internal networking, but must handle partial failures (timeouts/retries) from Day 1.
*   **Load Balancing**: We assume an L7 Load Balancer (Istio/Linkerd) will be present in Production to handle gRPC persistent connections.

### Assumption: Statelessness
*   The **TS Domain Service** is strictly stateless. All "Memory" must be passed in (via Request History) or retrieved from a fast L2 Cache (Redis) by the Service itself.

### Assumption: Cache Coherence
*   We rely on **Write-Through** caching. The DB is the archive; Redis is the source of truth for active sessions. We accept the risk of cache invalidation bugs during the prototype phase.
