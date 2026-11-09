<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A staff role: the modules its users can open. */
class Role extends Model
{
    protected $table = 'app_roles';

    protected $fillable = ['name', 'modules', 'is_admin'];

    protected $casts = ['modules' => 'array', 'is_admin' => 'boolean'];

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'role_id');
    }
}
