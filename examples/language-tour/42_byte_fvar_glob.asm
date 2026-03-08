; ZAX lowered .asm trace
; range: $0100..$206B (end exclusive)

; func byte_fvar_glob begin
byte_fvar_glob:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ld hl, (glob_idx_word)         ; 010E: 2A 00 00
push HL                        ; 0111: E5
pop HL                         ; 0112: E1
push HL                        ; 0113: E5
ld E, (IX + $0004)             ; 0114: DD 5E 04
ld D, (IX + $0005)             ; 0117: DD 56 05
ex DE, HL                      ; 011A: EB
pop DE                         ; 011B: D1
add HL, DE                     ; 011C: 19
push HL                        ; 011D: E5
pop HL                         ; 011E: E1
pop DE                         ; 011F: D1
pop BC                         ; 0120: C1
pop AF                         ; 0121: F1
ld A, (hl)                     ; 0122: 7E
push AF                        ; 0123: F5
push BC                        ; 0124: C5
push DE                        ; 0125: D5
ld hl, (glob_idx_word)         ; 0126: 2A 00 00
push HL                        ; 0129: E5
pop HL                         ; 012A: E1
push HL                        ; 012B: E5
ld E, (IX + $0004)             ; 012C: DD 5E 04
ld D, (IX + $0005)             ; 012F: DD 56 05
ex DE, HL                      ; 0132: EB
pop DE                         ; 0133: D1
add HL, DE                     ; 0134: 19
push HL                        ; 0135: E5
pop HL                         ; 0136: E1
pop DE                         ; 0137: D1
pop BC                         ; 0138: C1
pop AF                         ; 0139: F1
ld (hl), A                     ; 013A: 77
ld H, $0000                    ; 013B: 26 00
ld L, A                        ; 013D: 6F
__zax_epilogue_0:
pop DE                         ; 013E: D1
pop BC                         ; 013F: C1
pop AF                         ; 0140: F1
ld SP, IX                      ; 0141: DD F9
pop IX                         ; 0143: DD E1
ret                            ; 0145: C9
; func byte_fvar_glob end
; func main begin
main:
push IX                        ; 0146: DD E5
ld IX, $0000                   ; 0148: DD 21 00 00
add IX, SP                     ; 014C: DD 39
push AF                        ; 014E: F5
push BC                        ; 014F: C5
push DE                        ; 0150: D5
push HL                        ; 0151: E5
ld HL, glob_bytes              ; 0152: 21 00 00
push HL                        ; 0155: E5
call byte_fvar_glob            ; 0156: CD 00 00
inc SP                         ; 0159: 33
inc SP                         ; 015A: 33
__zax_epilogue_1:
pop HL                         ; 015B: E1
pop DE                         ; 015C: D1
pop BC                         ; 015D: C1
pop AF                         ; 015E: F1
ld SP, IX                      ; 015F: DD F9
pop IX                         ; 0161: DD E1
ret                            ; 0163: C9
; func main end

; symbols:
; label byte_fvar_glob = $0100
; label __zax_epilogue_0 = $013E
; label main = $0146
; label __zax_epilogue_1 = $015B
; data glob_bytes = $2000
; data glob_idx_word = $2008
; label __zax_startup = $200A
