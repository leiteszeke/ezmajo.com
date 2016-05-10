<!DOCTYPE html>
<html lang="en">
	<head>
		{head}
	</head>
	<body>
		{menu}
		<form class="form" id="recoverForm" method="post">
			<div class="form-group">
				<label class="control-label" for="recoverUsername">Nombre de Usuario</label>
				<input class="form-control" type="text" name="recoverUsername" id="recoverUsername" />
			</div>
			<div class="form-group">
				<button type="submit" class="btn btn-sm btn-success"><i class="fa fa-upload"></i>&nbsp;&nbsp;Recuperar</button>
			</div>
		</form>
		{footer}
		<script type="text/javascript" src="{base_url}js/admin/recover.js"></script>
	</body>
</html>