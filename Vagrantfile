# Vagrantfile for Gearsloth test environment
# vi: set sw=2 ts=2 sts=2 ft=ruby :

begin
  require './user.rb'
rescue LoadError
  module User
    def self.memory
      1024
    end
    def self.cpus
      1
    end
  end
end

VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  ### Machine settings
  #
  config.vm.hostname = "sloth"
  config.vm.box      = "trusty-2015-01-01"
  config.vm.box_url  = "https://cloud-images.ubuntu.com/vagrant/trusty/current/trusty-server-cloudimg-amd64-vagrant-disk1.box"

  ### Provisioning
  #
  config.vm.provision :shell, path: "virt/vagrant/stdintty.sh"
  config.vm.provision :shell, path: "virt/vagrant/apt.sh"
  config.vm.provision :shell, path: "virt/vagrant/dpkg.sh"
  config.vm.provision :shell, path: "virt/vagrant/docker.sh"
  config.vm.provision :shell, path: "virt/vagrant/make.sh", privileged: false

  ### Virtalbox configuration
  #
  config.vm.provider :virtualbox do |virtualbox|
    virtualbox.name   = "gearsloth-test-env"
    virtualbox.memory = User.memory
    virtualbox.cpus   = User.cpus
  end
end
