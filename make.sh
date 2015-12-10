#!/bin/sh

appname=tabcatalog

cp makexpi/makexpi.sh ./
./makexpi.sh $appname version=0
rm ./makexpi.sh

