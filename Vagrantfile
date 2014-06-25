# Vagrantfile for Gearsloth test environment
# vi: set sw=2 ts=2 sts=2 ft=ruby :
require_relative 'virt/vagrant/host.rb'

VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  ### Machine settings
  #
  config.vm.hostname = "sloth"
  config.vm.box      = "sloth-2014-06-06"
  config.vm.box_url  = "https://cloud-images.ubuntu.com/vagrant/trusty/current/trusty-server-cloudimg-amd64-vagrant-disk1.box"

  ### Provisioning
  #
  config.vm.provision :shell, path: "virt/vagrant/stdintty.sh"
  config.vm.provision :shell, path: "virt/vagrant/apt.sh"
  config.vm.provision :shell, path: "virt/vagrant/docker.sh"
  config.vm.provision :shell, path: "virt/vagrant/make.sh", privileged: false

  ### Virtalbox configuration
  #
  config.vm.provider :virtualbox do |virtualbox|
    virtualbox.name   = "sloth-test-env"
    virtualbox.memory = (Host.total_memory || 2730) * 3 / 4
    virtualbox.cpus   = Host.processor_count || 2
  end
end
