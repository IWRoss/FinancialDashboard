Restart pm2:

```
sudo systemctl reload-or-restart pm2-bitnami.service
```

Start pm2:

```
pm2 start server.js -n DashBot
```

Certificate:

```
sudo /opt/bitnami/bncert-tool
```

Copy config:

```
cp /opt/bitnami/apache2/conf/vhosts/sample-https-vhost.conf /opt/bitnami
/apache2/conf/vhosts/iwdash-https-vhost.conf
```

Apache:

```
sudo /opt/bitnami/ctlscript.sh restart apache
```
