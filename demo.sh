gearmand -d > /dev/null 2>&1
node reverse.js &
echo client: `echo "reverse this" | gearman -f reverse`
pkill node
pkill gearmand
