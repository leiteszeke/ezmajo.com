<!DOCTYPE html>
<html lang="en">
	<head>
		{head}
	</head>
	<body class="hold-transition login-page">
		<div class="login-box">
  			<div class="login-logo">
    			<a href="../../index2.html"><b>Admin</b>LTE</a>
  			</div>
  			<div class="login-box-body">
    			<p class="login-box-msg">Sign in to start your session</p>
			    <form id="loginForm" method="post">
			      	<div class="form-group has-feedback">
			        	<input type="text" id="loginUsername" name="loginUsername" class="form-control" placeholder="Email">
			        	<span class="glyphicon glyphicon-envelope form-control-feedback"></span>
			      	</div>
			      	<div class="form-group has-feedback">
			        	<input type="password" name="loginPassword" id="loginPassword" class="form-control" placeholder="Password">
			        	<span class="glyphicon glyphicon-lock form-control-feedback"></span>
			      	</div>
			      	<div class="row text-right">
    					<div class="col-xs-6 col-xs-offset-6">
    						<a href="{base_url}admin/recuperar">Olvide mi contraseña</a><br>
    					</div>
			        	<div class="col-xs-4 col-xs-offset-8">
			          		<button type="submit" class="btn btn-primary btn-block btn-flat">Ingresar</button>
			        	</div>
			     	</div>
    			</form>
  			</div>
		</div>
		<script type="text/javascript" src="{base_url}js/admin/login.js"></script>
	</body>
</html>