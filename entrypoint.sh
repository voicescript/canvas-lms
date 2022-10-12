#!/usr/bin/env bash

cd /var/canvas
ruby generate_config.rb
chown -R app:app config/

if [ $# -eq 0 ]; then
  CMD="run"
else
  CMD=$1
fi

if [ "$CMD" == "setup_db" ]; then

  bundle exec rake db:initial_setup

elif [ "$CMD" == "migrate" ]; then

  bundle exec rake db:migrate

elif [ "$CMD" == "compile_assets" ]; then

  bundle exec rake canvas:compile_assets

elif [ "$CMD" == "run" ]; then

  bundle exec rake db:migrate
  rm -f /etc/service/nginx/down

elif [ "$CMD" == "server" ]; then

  rm -f /etc/service/nginx/down

elif [ "$CMD" == "delayed_job" ]; then

  script/delayed_job run

elif [ "$CMD" == "debug" ]; then

  exec /bin/bash

else

  # Execute shell command
  /bin/bash -c "$CMD"

fi