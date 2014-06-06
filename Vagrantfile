# Vagrantfile for Gearsloth test environment
# vi: set sw=2 ts=2 sts=2 ft=ruby :

VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  ### Machine settings
  #
  config.vm.hostname = "sloth-host"
  config.vm.box      = "sloth-2014-05-18"
  config.vm.box_url  = "https://cloud-images.ubuntu.com/vagrant/trusty/current/trusty-server-cloudimg-i386-vagrant-disk1.box"

  ### Provisioning
  #
  config.vm.provision :shell, path: ".provision/stdintty.sh"
  config.vm.provision :shell, path: ".provision/apt.sh"
  config.vm.provision :shell, path: ".provision/make.sh"

  ### Virtalbox configuration
  #
  config.vm.provider :virtualbox do |virtualbox|
    virtualbox.name   = "sloth-machine"
    virtualbox.memory = "512"
  end
end
