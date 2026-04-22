-- 2 punti vendita di esempio
insert into stores (code, name, type, city, country) values
  ('TIR01', 'Tirana Centrale', 'mixed', 'Tirana', 'AL'),
  ('DUR01', 'Durazzo', 'shop', 'Durrës', 'AL');

-- Categorie base (espandibile)
insert into product_categories (name, slug) values
  ('Centraline ABS', 'abs'),
  ('Centraline motore', 'ecu'),
  ('Carrozzeria', 'body'),
  ('Sospensioni', 'suspension'),
  ('Impianto elettrico', 'electrical'),
  ('Utensili officina', 'tools');

-- Marche veicolo più comuni nell'inventario esistente
insert into vehicle_makes (name) values
  ('Audi'), ('Mercedes-Benz'), ('Volkswagen'), ('BMW'),
  ('Opel'), ('Skoda'), ('Renault'), ('Range Rover'), ('Ford'),
  ('Peugeot'), ('Fiat'), ('Toyota');
