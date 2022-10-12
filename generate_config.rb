require 'erb'

raise "Missing environment variables" unless ENV['DB_HOST'] && ENV['DB_DATABASE']


class Namespace
  def initialize(hash)
    hash.each do |key, value|
      singleton_class.send(:define_method, key) { value }
    end
  end

  def get_binding
    binding
  end
end

ns = Namespace.new(ENV: ENV)

Dir['config/templates/*.erb'].each do |fname|
  puts "Processing #{fname}..."
  text = File.read fname
  result = ERB.new(text).result(ns.get_binding)

  new_filename = fname.sub('/templates/', '/').sub(/\.erb$/, '')

  open(new_filename, 'w') { |f| f.puts result }
end
