#!/bin/bash
cd /opt/motionmesh
git pull
cd server
docker build -f Dockerfile.api -t motionmesh-api:latest .
systemctl restart motionmesh-api
