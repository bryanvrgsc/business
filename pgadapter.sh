gcloud compute ssh spanner-proxy-vm --zone=northamerica-south1-b

sudo apt-get update
sudo apt-get install -y default-jre

wget https://storage.googleapis.com/pgadapter-jar-releases/pgadapter.tar.gz
tar -xzvf pgadapter.tar.gz

# Añadir repo de Cloudflare
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Ejecutar en segundo plano (screen)
screen -S proxy

# Dentro de screen, ejecuta PGAdapter escuchando en localhost:5432
java -jar pgadapter.jar -p [TU-PROYECTO] -i [TU-INSTANCIA] -d [TU-DB] -s 5432 &

# Ahora crea el túnel con Cloudflare (te pedirá login la primera vez)
cloudflared tunnel login
# Sigue el link que te da para autorizar

# Crear el túnel
cloudflared tunnel create cmms-db-tunnel

# Enrutar el túnel a tu dominio (ej. db.tudominio.com)
cloudflared tunnel route dns cmms-db-tunnel db.tudominio.com

# Ejecutar el túnel apuntando al puerto local 5432
cloudflared tunnel run --url tcp://localhost:5432 cmms-db-tunnel

# Indentificar project, instance and database
# gcloud spanner instances list
# gcloud spanner databases list --instance=[TU-INSTANCIA]
# gcloud projects list
sudo apt-get update && sudo apt-get install -y default-jre

java -jar pgadapter.jar -p business-487407 -i business247 -d business -s 5432 &

npx wrangler hyperdrive create cmms-hyperdrive --connection-string="postgres://user:password@db.tudominio.com:5432/business"


