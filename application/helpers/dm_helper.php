<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

function truncate($text, $length = 100, $ending = '...', $exact = false, $considerHtml = true) {
    //echo "original: " . $text . "<br />";
	if ($considerHtml) {
		// if the plain text is shorter than the maximum length, return the whole text
		if (strlen(preg_replace('/<.*?>/', '', $text)) <= $length) {
			return $text;
		}
		// splits all html-tags to scanable lines
		preg_match_all('/(<.+?>)?([^<>]*)/s', $text, $lines, PREG_SET_ORDER);
		$total_length = strlen($ending);
		$open_tags = array();
		$truncate = '';
		foreach ($lines as $line_matchings) {
			// if there is any html-tag in this line, handle it and add it (uncounted) to the output
			if (!empty($line_matchings[1])) {
				// if it's an "empty element" with or without xhtml-conform closing slash
				if (preg_match('/^<(\s*.+?\/\s*|\s*(img|br|input|hr|area|base|basefont|col|frame|isindex|link|meta|param)(\s.+?)?)>$/is', $line_matchings[1])) {
					// do nothing
				// if tag is a closing tag
				} else if (preg_match('/^<\s*\/([^\s]+?)\s*>$/s', $line_matchings[1], $tag_matchings)) {
					// delete tag from $open_tags list
					$pos = array_search($tag_matchings[1], $open_tags);
					if ($pos !== false) {
					unset($open_tags[$pos]);
					}
				// if tag is an opening tag
				} else if (preg_match('/^<\s*([^\s>!]+).*?>$/s', $line_matchings[1], $tag_matchings)) {
					// add tag to the beginning of $open_tags list
					array_unshift($open_tags, strtolower($tag_matchings[1]));
				}
				// add html-tag to $truncate'd text
				$truncate .= $line_matchings[1];
			}
			// calculate the length of the plain text part of the line; handle entities as one character
			$content_length = strlen(preg_replace('/&[0-9a-z]{2,8};|&#[0-9]{1,7};|[0-9a-f]{1,6};/i', ' ', $line_matchings[2]));
			if ($total_length+$content_length> $length) {
				// the number of characters which are left
				$left = $length - $total_length;
				$entities_length = 0;
				// search for html entities
				if (preg_match_all('/&[0-9a-z]{2,8};|&#[0-9]{1,7};|[0-9a-f]{1,6};/i', $line_matchings[2], $entities, PREG_OFFSET_CAPTURE)) {
					// calculate the real length of all entities in the legal range
					foreach ($entities[0] as $entity) {
						if ($entity[1]+1-$entities_length <= $left) {
							$left--;
							$entities_length += strlen($entity[0]);
						} else {
							// no more characters left
							break;
						}
					}
				}
				$truncate .= substr($line_matchings[2], 0, $left+$entities_length);
				// maximum lenght is reached, so get off the loop
				break;
			} else {
				$truncate .= $line_matchings[2];
				$total_length += $content_length;
			}
			// if the maximum length is reached, get off the loop
			if($total_length>= $length) {
				break;
			}
		}
	} else {
		if (strlen($text) <= $length) {
			return $text;
		} else {
			$truncate = substr($text, 0, $length - strlen($ending));
		}
	}
	// if the words shouldn't be cut in the middle...
	if (!$exact) {
		// ...search the last occurance of a space...
		$spacepos = strrpos($truncate, ' ');
		if (isset($spacepos)) {
			// ...and cut the text in this position
			$truncate = substr($truncate, 0, $spacepos);
		}
	}
	// add the defined ending to the text
	$truncate .= $ending;
	if($considerHtml) {
		// close all unclosed html-tags
		foreach ($open_tags as $tag) {
			$truncate .= '</' . $tag . '>';
		}
	}
    
    //echo "truncado: " . $truncate . "<hr />";
    
	return $truncate;
}

function calcular_anios($fecha_fin, $fecha_inicio, $separador = "/"){
	list($dia1, $mes1, $ano1) = explode($separador, $fecha_inicio);
	list($dia2, $mes2, $ano2) = explode($separador, $fecha_fin);
	
	$fecha1 = mktime(0, 0, 0, $mes1, $dia1, $ano1);
	$fecha2 = mktime(0, 0, 0, $mes2, $dia2, $ano2);
	
	$diferencia = abs($fecha2 - $fecha1);
	
	(($diferencia%4) == 0)? $d = 365 : $d = 366;
    $anos_diferencia = floor($diferencia/(60*60*24*$d));
	
	return $anos_diferencia;
}

function convertir_bytes($bytes, $caso) {
   $kb = number_format($bytes / 1024, 2);
   $mb = number_format($kb / 1024, 2);
   $gb = number_format($mb / 1024, 2);
   
   switch($caso){
       case "kb":
           $return = $kb;
       break;
       case "mb":
           $return = $mb;
       break;
       case "gb":
           $return = $gb;
       break;
       default:
           $return = $mb;
       break;
   }
   
   return $return;
}

function escalar($imagen, $destino, $max_ancho, $max_alto, $calidad = 95){
    //Ruta de la imagen original
    $rutaImagenOriginal = $imagen;
    
    //Creamos una variable imagen a partir de la imagen original
    $img_original = imagecreatefromjpeg($rutaImagenOriginal);
    
    //Ancho y alto de la imagen original
    list($ancho, $alto) = getimagesize($rutaImagenOriginal);
    
    //Se calcula ancho y alto de la imagen final
    $x_ratio = $max_ancho / $ancho;
    $y_ratio = $max_alto / $alto;
    
    //Si el ancho y el alto de la imagen no superan los maximos,
    //ancho final y alto final son los que tiene actualmente
    if( ($ancho <= $max_ancho) && ($alto <= $max_alto) ){//Si ancho
        $ancho_final = $ancho;
        $alto_final = $alto;
    }
    
    /*
    * si proporcion horizontal*alto mayor que el alto maximo,
    * alto final es alto por la proporcion horizontal
    * es decir, le quitamos al ancho, la misma proporcion que
    * le quitamos al alto
    *
    */
    elseif (($x_ratio * $alto) < $max_alto){
        $alto_final = ceil($x_ratio * $alto);
        $ancho_final = $max_ancho;
    }
    /*
    * Igual que antes pero a la inversa
    */
    else{
        $ancho_final = ceil($y_ratio * $ancho);
        $alto_final = $max_alto;
    }  
    
    
    //Creamos una imagen en blanco de tamaño $ancho_final  por $alto_final .
    $tmp=imagecreatetruecolor($ancho_final, $alto_final);
    
    //Copiamos $img_original sobre la imagen que acabamos de crear en blanco ($tmp)
    imagecopyresampled($tmp,$img_original, 0, 0, 0, 0, $ancho_final, $alto_final, $ancho,$alto);
    
    //Se destruye variable $img_original para liberar memoria
    imagedestroy($img_original);
    
    //Se crea la imagen final en el directorio indicado
    imagejpeg($tmp, $destino, $calidad);
}

function get_start_week(){
	$start_week = date("D");
	if ($start_week=="Fri"){
		$start_week =  date("Ymd")."000000";
	}else{
		$start_week = date("Ymd", strtotime("Last Friday"))."000000";
	}
	
	//$start_week = "20120220000000";
	
	return $start_week;
}

function get_end_week(){
	$end_week = date("D");
	if ($end_week == "Thu"){
		$end_week = date("Ymd")."000000";
	}else{
		$end_week = date("Ymd", strtotime("Next Thursday"))."235900";
	}
	
	//$end_week = "20500101000000";
	return $end_week;
}

function orderMultiDimensionalArray ($toOrderArray, $field, $inverse = false) {  
    $position = array();  
    $newRow = array();  
    foreach ($toOrderArray as $key => $row) {  
            $position[$key]  = $row[$field];  
            $newRow[$key] = $row;  
    }  
    if ($inverse) {  
        arsort($position);  
    }  
    else {  
        asort($position);  
    }  
    $returnArray = array();  
    foreach ($position as $key => $pos) {       
        $returnArray[] = $newRow[$key];  
    }  
    return $returnArray;  
}

function d($el){
    echo "<pre>"; print_r($el); echo "</pre>";
}