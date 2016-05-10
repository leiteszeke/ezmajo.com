<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

	class Mails_model extends CI_Model{     
		function Mails_model(){
	        parent::__construct();
		}

		function enviarRecuperacion($user, $codigo){
			require_once($this->config->item("base_path")."libraries/PHPMailer/PHPMailerAutoload.php");

			$mail = new PHPMailer();

			$mail->setFrom($this->config->item("mail_from"), $this->config->item("name_from"));
			$mail->addAddress($user["email_usuario"], $user["nombre_usuario"]." ".$user["apellido_usuario"]); 

			$mail->isHTML(true); 

			$mail->Subject = 'Recupero de Contraseña';
			$mail->Body    = 'Para recuperar su clave ingrese a '.$this->config->item("base_url")."recuperar/".$codigo;
			$mail->AltBody = 'Para recuperar su clave ingrese a '.$this->config->item("base_url")."recuperar/".$codigo;

			if($mail->send()){
				return true;
			}else{
				return false;
			}
		}
	}
?>