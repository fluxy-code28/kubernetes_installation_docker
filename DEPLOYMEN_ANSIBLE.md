# Ansible Deployment Automation for Kubernetes Application
Here is an Ansible playbook to automate the deployment process for your application, including cloning from Git, building and distributing Docker images, and deploying to Kubernetes.

```yaml
---
- name: Deploy Login Application to Kubernetes
  hosts: localhost
  become: false
  vars:
    git_repo: https://github.com/yourusername/k8s-login-app.git
    git_branch: main
    app_dir: "{{ playbook_dir }}/k8s-login-app"
    worker_nodes:
      - name: worker1
        user: ubuntu
        ip: 10.34.7.X  # Replace with actual worker IP
      - name: worker2
        user: ubuntu
        ip: 10.34.7.Y  # Replace with actual worker IP
    master_node_ip: 10.34.7.115

  tasks:
    - name: Create app directory if it doesn't exist
      file:
        path: "{{ app_dir }}"
        state: directory

    - name: Clone git repository
      git:
        repo: "{{ git_repo }}"
        dest: "{{ app_dir }}"
        version: "{{ git_branch }}"
        clone: yes
        update: yes

    - name: Create data directory on worker nodes
      delegate_to: "{{ item.ip }}"
      become: true
      file:
        path: /mnt/data
        state: directory
        mode: '0777'
      with_items: "{{ worker_nodes }}"

    - name: Build Docker image
      shell: |
        cd {{ app_dir }}/app
        docker build -t login-app:latest .
      args:
        executable: /bin/bash

    - name: Save Docker image
      shell: docker save login-app:latest > {{ app_dir }}/app/login-app.tar
      args:
        executable: /bin/bash

    - name: Copy Docker image to worker nodes
      copy:
        src: "{{ app_dir }}/app/login-app.tar"
        dest: "/tmp/login-app.tar"
      delegate_to: "{{ item.ip }}"
      with_items: "{{ worker_nodes }}"

    - name: Load Docker image on worker nodes
      delegate_to: "{{ item.ip }}"
      shell: docker load < /tmp/login-app.tar
      with_items: "{{ worker_nodes }}"

    # Adding server identification code for load balancer 
    - name: Create server-patch.js file
      copy:
        content: |
          const os = require('os');
          const serverInfo = {
            hostname: os.hostname(),
            podName: process.env.POD_NAME || 'unknown',
            nodeName: process.env.NODE_NAME || 'unknown'
          };

          // Add this after the health route
          app.get('/server-info', (req, res) => {
            res.json(serverInfo);
          });

          // Insert this line before app.listen
          app.use((req, res, next) => {
            res.setHeader('X-Served-By', serverInfo.podName);
            next();
          });
        dest: "{{ app_dir }}/app/server-patch.js"

    - name: Apply server patch for load balancer
      shell: |
        cd {{ app_dir }}/app
        cat server-patch.js >> server.js
        docker build -t login-app:latest .
        docker save login-app:latest > login-app.tar
      args:
        executable: /bin/bash

    - name: Copy updated Docker image to worker nodes
      copy:
        src: "{{ app_dir }}/app/login-app.tar"
        dest: "/tmp/login-app.tar"
      delegate_to: "{{ item.ip }}"
      with_items: "{{ worker_nodes }}"

    - name: Load updated Docker image on worker nodes
      delegate_to: "{{ item.ip }}"
      shell: docker load < /tmp/login-app.tar
      with_items: "{{ worker_nodes }}"

    - name: Clean up old deployments 
      shell: |
        kubectl delete deployment login-app mysql --ignore-not-found
        kubectl delete service login-app mysql --ignore-not-found
        kubectl delete pvc mysql-pvc --ignore-not-found
        kubectl delete pv mysql-pv --ignore-not-found
        kubectl delete secret mysql-secret --ignore-not-found
      args:
        executable: /bin/bash
      ignore_errors: true

    - name: Deploy MySQL
      shell: |
        cd {{ app_dir }}
        kubectl apply -f k8s/mysql-secret.yaml
        kubectl apply -f k8s/mysql-pv.yaml
        kubectl apply -f k8s/mysql-pvc.yaml
        kubectl apply -f k8s/mysql-deployment.yaml
        kubectl apply -f k8s/mysql-service.yaml
      args:
        executable: /bin/bash

    - name: Wait for MySQL to be ready
      shell: |
        kubectl wait --for=condition=ready pod -l app=mysql --timeout=180s
      args:
        executable: /bin/bash
      ignore_errors: true

    - name: Deploy Standard Web Application
      shell: |
        cd {{ app_dir }}
        kubectl apply -f k8s/web-deployment.yaml
        kubectl apply -f k8s/web-service.yaml
      args:
        executable: /bin/bash

    - name: Deploy Load Balancer Configuration
      shell: |
        cd {{ app_dir }}
        kubectl apply -f k8s/web-deployment-lb.yaml
        kubectl create namespace ingress-nginx --dry-run=client -o yaml | kubectl apply -f -
        
        # Add Helm repo if not already added
        helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx || true
        helm repo update
        
        # Get worker node name
        WORKER_NODE=$(kubectl get nodes | grep -v master | grep -v control | head -1 | awk '{print $1}')
        
        # Install Nginx Ingress Controller
        helm install ingress-nginx ingress-nginx/ingress-nginx \
          --namespace ingress-nginx \
          --set controller.nodeSelector."kubernetes\\.io/hostname"=$WORKER_NODE \
          --set controller.service.type=NodePort \
          --set controller.service.nodePorts.http=30081
        
        kubectl apply -f k8s/login-app-ingress.yaml
        kubectl apply -f k8s/web-service-lb.yaml
      args:
        executable: /bin/bash
      ignore_errors: true

    - name: Display access information
      debug:
        msg: |
          Deployment completed!
          
          Standard application access:
          http://{{ master_node_ip }}:30080
          
          Load balanced application access:
          http://{{ master_node_ip }}:30081
          
          Login credentials:
          Username: admin
          Password: admin123

    - name: Test load balancer
      shell: |
        for i in {1..5}; do 
          curl -s http://{{ master_node_ip }}:30081/server-info
          echo ""
          sleep 1
        done
      register: lb_test
      ignore_errors: true

    - name: Display load balancer test results
      debug:
        var: lb_test.stdout_lines
      when: lb_test is defined
```

## Instructions for Using the Ansible Playbook

1. Save the above playbook as `ansible-deploy.yml`

2. Update the variables at the top of the playbook:
   - `git_repo`: Update with your actual Git repository URL
   - `worker_nodes`: Replace with the actual IPs and usernames for your worker nodes 
   - `master_node_ip`: Replace with your master node IP

3. Install required Ansible modules:
   ```bash
   ansible-galaxy collection install kubernetes.core
   ansible-galaxy collection install community.general
   ```

4. Make sure you have Ansible installed:
   ```bash
   pip install ansible
   ```

5. Run the playbook:
   ```bash
   ansible-playbook ansible-deploy.yml
   ```

## Prerequisites

1. Ansible installed on the control machine
2. SSH access to worker nodes with passwordless authentication set up
3. kubectl configured on the machine where Ansible runs
4. Helm installed for the load balancer deployment
5. Docker installed on all machines

## Customizing the Deployment

1. If you have more worker nodes, add them to the `worker_nodes` list
2. If your Git repository requires authentication, add credentials to the Git task
3. Modify the Docker build process if you need additional steps
4. Adjust the kubernetes wait timeouts if needed

This Ansible playbook automates the entire deployment process, including building and distributing Docker images, setting up the database, and configuring the load balancer.