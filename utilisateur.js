class Utilisateur {
  constructor(nom, email) {
    this.nom = nom;
    this.email = email;
  }

  presenter() {
    return `Je suis ${this.nom} (${this.email})`;
  }
}

module.exports = Utilisateur;
