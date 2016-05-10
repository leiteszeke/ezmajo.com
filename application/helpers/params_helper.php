<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

function wrap_call_user_func_array($c, $a, $p) {
    switch(count($p)) {
        case 0: return $c->{$a}(); break;
        case 1: return $c->{$a}($p[0]); break;
        case 2: return $c->{$a}($p[0], $p[1]); break;
        case 3: return $c->{$a}($p[0], $p[1], $p[2]); break;
        case 4: return $c->{$a}($p[0], $p[1], $p[2], $p[3]); break;
        case 5: return $c->{$a}($p[0], $p[1], $p[2], $p[3], $p[4]); break;
        default: return call_user_func_array(array($c, $a), $p);  break;
    }
} 
