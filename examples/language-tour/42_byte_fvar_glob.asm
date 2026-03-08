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
push AF                        ; 0124: F5
push BC                        ; 0125: C5
push DE                        ; 0126: D5
ld hl, (glob_idx_word)         ; 0127: 2A 00 00
push HL                        ; 012A: E5
pop HL                         ; 012B: E1
push HL                        ; 012C: E5
ld E, (IX + $0004)             ; 012D: DD 5E 04
ld D, (IX + $0005)             ; 0130: DD 56 05
ex DE, HL                      ; 0133: EB
pop DE                         ; 0134: D1
add HL, DE                     ; 0135: 19
push HL                        ; 0136: E5
pop HL                         ; 0137: E1
pop DE                         ; 0138: D1
pop BC                         ; 0139: C1
pop AF                         ; 013A: F1
ld (hl), A                     ; 013B: 77
pop AF                         ; 013C: F1
ld H, $0000                    ; 013D: 26 00
ld L, A                        ; 013F: 6F
__zax_epilogue_0:
pop DE                         ; 0140: D1
pop BC                         ; 0141: C1
pop AF                         ; 0142: F1
ld SP, IX                      ; 0143: DD F9
pop IX                         ; 0145: DD E1
ret                            ; 0147: C9
; func byte_fvar_glob end
; func main begin
main:
push IX                        ; 0148: DD E5
ld IX, $0000                   ; 014A: DD 21 00 00
add IX, SP                     ; 014E: DD 39
push AF                        ; 0150: F5
push BC                        ; 0151: C5
push DE                        ; 0152: D5
push HL                        ; 0153: E5
ld HL, glob_bytes              ; 0154: 21 00 00
push HL                        ; 0157: E5
call byte_fvar_glob            ; 0158: CD 00 00
inc SP                         ; 015B: 33
inc SP                         ; 015C: 33
__zax_epilogue_1:
pop HL                         ; 015D: E1
pop DE                         ; 015E: D1
pop BC                         ; 015F: C1
pop AF                         ; 0160: F1
ld SP, IX                      ; 0161: DD F9
pop IX                         ; 0163: DD E1
ret                            ; 0165: C9
; func main end

; symbols:
; label byte_fvar_glob = $0100
; label __zax_epilogue_0 = $0140
; label main = $0148
; label __zax_epilogue_1 = $015D
; data glob_bytes = $2000
; data glob_idx_word = $2008
; label __zax_startup = $200A
