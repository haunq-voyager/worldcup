<?php

namespace Database\Seeders;

use App\Models\Team;
use Illuminate\Database\Seeder;

class TeamSeeder extends Seeder
{
    public function run(): void
    {
        // World Cup 2026 - 48 đội thực tế từ API worldcup26.ir
        // 12 bảng A-L, mỗi bảng 4 đội
        $teams = [
            // Bảng A
            ['name' => 'Mexico',               'country_code' => 'MEX', 'flag_url' => 'https://flagcdn.com/w80/mx.png',     'group_name' => 'A', 'confederation' => 'CONCACAF'],
            ['name' => 'Nam Phi',              'country_code' => 'RSA', 'flag_url' => 'https://flagcdn.com/w80/za.png',     'group_name' => 'A', 'confederation' => 'CAF'],
            ['name' => 'Hàn Quốc',            'country_code' => 'KOR', 'flag_url' => 'https://flagcdn.com/w80/kr.png',     'group_name' => 'A', 'confederation' => 'AFC'],
            ['name' => 'Cộng hòa Séc',        'country_code' => 'CZE', 'flag_url' => 'https://flagcdn.com/w80/cz.png',     'group_name' => 'A', 'confederation' => 'UEFA'],

            // Bảng B
            ['name' => 'Canada',               'country_code' => 'CAN', 'flag_url' => 'https://flagcdn.com/w80/ca.png',     'group_name' => 'B', 'confederation' => 'CONCACAF'],
            ['name' => 'Bosnia & Herzegovina', 'country_code' => 'BIH', 'flag_url' => 'https://flagcdn.com/w80/ba.png',     'group_name' => 'B', 'confederation' => 'UEFA'],
            ['name' => 'Qatar',                'country_code' => 'QAT', 'flag_url' => 'https://flagcdn.com/w80/qa.png',     'group_name' => 'B', 'confederation' => 'AFC'],
            ['name' => 'Thụy Sĩ',             'country_code' => 'SUI', 'flag_url' => 'https://flagcdn.com/w80/ch.png',     'group_name' => 'B', 'confederation' => 'UEFA'],

            // Bảng C
            ['name' => 'Brazil',               'country_code' => 'BRA', 'flag_url' => 'https://flagcdn.com/w80/br.png',     'group_name' => 'C', 'confederation' => 'CONMEBOL'],
            ['name' => 'Maroc',                'country_code' => 'MAR', 'flag_url' => 'https://flagcdn.com/w80/ma.png',     'group_name' => 'C', 'confederation' => 'CAF'],
            ['name' => 'Haiti',                'country_code' => 'HAI', 'flag_url' => 'https://flagcdn.com/w80/ht.png',     'group_name' => 'C', 'confederation' => 'CONCACAF'],
            ['name' => 'Scotland',             'country_code' => 'SCO', 'flag_url' => 'https://flagcdn.com/w80/gb-sct.png', 'group_name' => 'C', 'confederation' => 'UEFA'],

            // Bảng D
            ['name' => 'Hoa Kỳ',              'country_code' => 'USA', 'flag_url' => 'https://flagcdn.com/w80/us.png',     'group_name' => 'D', 'confederation' => 'CONCACAF'],
            ['name' => 'Paraguay',             'country_code' => 'PAR', 'flag_url' => 'https://flagcdn.com/w80/py.png',     'group_name' => 'D', 'confederation' => 'CONMEBOL'],
            ['name' => 'Úc',                   'country_code' => 'AUS', 'flag_url' => 'https://flagcdn.com/w80/au.png',     'group_name' => 'D', 'confederation' => 'AFC'],
            ['name' => 'Thổ Nhĩ Kỳ',          'country_code' => 'TUR', 'flag_url' => 'https://flagcdn.com/w80/tr.png',     'group_name' => 'D', 'confederation' => 'UEFA'],

            // Bảng E
            ['name' => 'Bờ Biển Ngà',         'country_code' => 'CIV', 'flag_url' => 'https://flagcdn.com/w80/ci.png',     'group_name' => 'E', 'confederation' => 'CAF'],
            ['name' => 'Ecuador',              'country_code' => 'ECU', 'flag_url' => 'https://flagcdn.com/w80/ec.png',     'group_name' => 'E', 'confederation' => 'CONMEBOL'],
            ['name' => 'Đức',                  'country_code' => 'GER', 'flag_url' => 'https://flagcdn.com/w80/de.png',     'group_name' => 'E', 'confederation' => 'UEFA'],
            ['name' => 'Curaçao',              'country_code' => 'CUW', 'flag_url' => 'https://flagcdn.com/w80/cw.png',     'group_name' => 'E', 'confederation' => 'CONCACAF'],

            // Bảng F
            ['name' => 'Hà Lan',               'country_code' => 'NED', 'flag_url' => 'https://flagcdn.com/w80/nl.png',     'group_name' => 'F', 'confederation' => 'UEFA'],
            ['name' => 'Nhật Bản',             'country_code' => 'JPN', 'flag_url' => 'https://flagcdn.com/w80/jp.png',     'group_name' => 'F', 'confederation' => 'AFC'],
            ['name' => 'Thụy Điển',            'country_code' => 'SWE', 'flag_url' => 'https://flagcdn.com/w80/se.png',     'group_name' => 'F', 'confederation' => 'UEFA'],
            ['name' => 'Tunisia',              'country_code' => 'TUN', 'flag_url' => 'https://flagcdn.com/w80/tn.png',     'group_name' => 'F', 'confederation' => 'CAF'],

            // Bảng G
            ['name' => 'Ai Cập',               'country_code' => 'EGY', 'flag_url' => 'https://flagcdn.com/w80/eg.png',     'group_name' => 'G', 'confederation' => 'CAF'],
            ['name' => 'Bỉ',                   'country_code' => 'BEL', 'flag_url' => 'https://flagcdn.com/w80/be.png',     'group_name' => 'G', 'confederation' => 'UEFA'],
            ['name' => 'Iran',                 'country_code' => 'IRN', 'flag_url' => 'https://flagcdn.com/w80/ir.png',     'group_name' => 'G', 'confederation' => 'AFC'],
            ['name' => 'New Zealand',          'country_code' => 'NZL', 'flag_url' => 'https://flagcdn.com/w80/nz.png',     'group_name' => 'G', 'confederation' => 'OFC'],

            // Bảng H
            ['name' => 'Tây Ban Nha',          'country_code' => 'ESP', 'flag_url' => 'https://flagcdn.com/w80/es.png',     'group_name' => 'H', 'confederation' => 'UEFA'],
            ['name' => 'Cape Verde',           'country_code' => 'CPV', 'flag_url' => 'https://flagcdn.com/w80/cv.png',     'group_name' => 'H', 'confederation' => 'CAF'],
            ['name' => 'Saudi Arabia',         'country_code' => 'KSA', 'flag_url' => 'https://flagcdn.com/w80/sa.png',     'group_name' => 'H', 'confederation' => 'AFC'],
            ['name' => 'Uruguay',              'country_code' => 'URU', 'flag_url' => 'https://flagcdn.com/w80/uy.png',     'group_name' => 'H', 'confederation' => 'CONMEBOL'],

            // Bảng I
            ['name' => 'Pháp',                 'country_code' => 'FRA', 'flag_url' => 'https://flagcdn.com/w80/fr.png',     'group_name' => 'I', 'confederation' => 'UEFA'],
            ['name' => 'Senegal',              'country_code' => 'SEN', 'flag_url' => 'https://flagcdn.com/w80/sn.png',     'group_name' => 'I', 'confederation' => 'CAF'],
            ['name' => 'Iraq',                 'country_code' => 'IRQ', 'flag_url' => 'https://flagcdn.com/w80/iq.png',     'group_name' => 'I', 'confederation' => 'AFC'],
            ['name' => 'Na Uy',                'country_code' => 'NOR', 'flag_url' => 'https://flagcdn.com/w80/no.png',     'group_name' => 'I', 'confederation' => 'UEFA'],

            // Bảng J
            ['name' => 'Argentina',            'country_code' => 'ARG', 'flag_url' => 'https://flagcdn.com/w80/ar.png',     'group_name' => 'J', 'confederation' => 'CONMEBOL'],
            ['name' => 'Algeria',              'country_code' => 'ALG', 'flag_url' => 'https://flagcdn.com/w80/dz.png',     'group_name' => 'J', 'confederation' => 'CAF'],
            ['name' => 'Áo',                   'country_code' => 'AUT', 'flag_url' => 'https://flagcdn.com/w80/at.png',     'group_name' => 'J', 'confederation' => 'UEFA'],
            ['name' => 'Jordan',               'country_code' => 'JOR', 'flag_url' => 'https://flagcdn.com/w80/jo.png',     'group_name' => 'J', 'confederation' => 'AFC'],

            // Bảng K
            ['name' => 'Bồ Đào Nha',          'country_code' => 'POR', 'flag_url' => 'https://flagcdn.com/w80/pt.png',     'group_name' => 'K', 'confederation' => 'UEFA'],
            ['name' => 'CHDC Congo',           'country_code' => 'COD', 'flag_url' => 'https://flagcdn.com/w80/cd.png',     'group_name' => 'K', 'confederation' => 'CAF'],
            ['name' => 'Uzbekistan',           'country_code' => 'UZB', 'flag_url' => 'https://flagcdn.com/w80/uz.png',     'group_name' => 'K', 'confederation' => 'AFC'],
            ['name' => 'Colombia',             'country_code' => 'COL', 'flag_url' => 'https://flagcdn.com/w80/co.png',     'group_name' => 'K', 'confederation' => 'CONMEBOL'],

            // Bảng L
            ['name' => 'Anh',                  'country_code' => 'ENG', 'flag_url' => 'https://flagcdn.com/w80/gb-eng.png', 'group_name' => 'L', 'confederation' => 'UEFA'],
            ['name' => 'Croatia',              'country_code' => 'CRO', 'flag_url' => 'https://flagcdn.com/w80/hr.png',     'group_name' => 'L', 'confederation' => 'UEFA'],
            ['name' => 'Ghana',                'country_code' => 'GHA', 'flag_url' => 'https://flagcdn.com/w80/gh.png',     'group_name' => 'L', 'confederation' => 'CAF'],
            ['name' => 'Panama',               'country_code' => 'PAN', 'flag_url' => 'https://flagcdn.com/w80/pa.png',     'group_name' => 'L', 'confederation' => 'CONCACAF'],
        ];

        foreach ($teams as $team) {
            Team::firstOrCreate(['country_code' => $team['country_code']], $team);
        }
    }
}
