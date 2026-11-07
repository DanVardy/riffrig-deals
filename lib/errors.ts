export class PersistenceUnavailable extends Error {
  constructor() {
    super("persistence_unavailable");
    this.name = "PersistenceUnavailable";
  }
}
