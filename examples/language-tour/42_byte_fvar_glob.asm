; ZAX lowered .asm trace
; range: $0100..$200A (end exclusive)

; func byte_fvar_glob begin
byte_fvar_glob:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld HL, (glob_idx_word)         ; 010B: 2A 00 00
push HL                        ; 010E: E5
pop HL                         ; 010F: E1
push HL                        ; 0110: E5
push DE                        ; 0111: D5
push IX                        ; 0112: DD E5
pop HL                         ; 0114: E1
ld DE, $0004                   ; 0115: 11 04 00
add HL, DE                     ; 0118: 19
pop DE                         ; 0119: D1
pop DE                         ; 011A: D1
add HL, DE                     ; 011B: 19
push HL                        ; 011C: E5
pop HL                         ; 011D: E1
ld A, (hl)                     ; 011E: 7E
push AF                        ; 011F: F5
ld HL, (glob_idx_word)         ; 0120: 2A 00 00
push HL                        ; 0123: E5
pop HL                         ; 0124: E1
push HL                        ; 0125: E5
push DE                        ; 0126: D5
push IX                        ; 0127: DD E5
pop HL                         ; 0129: E1
ld DE, $0004                   ; 012A: 11 04 00
add HL, DE                     ; 012D: 19
pop DE                         ; 012E: D1
pop DE                         ; 012F: D1
add HL, DE                     ; 0130: 19
push HL                        ; 0131: E5
pop HL                         ; 0132: E1
ld (hl), A                     ; 0133: 77
pop AF                         ; 0134: F1
ld H, $0000                    ; 0135: 26 00
ld L, A                        ; 0137: 6F
__zax_epilogue_0:
pop DE                         ; 0138: D1
pop BC                         ; 0139: C1
pop AF                         ; 013A: F1
ld SP, IX                      ; 013B: DD F9
pop IX                         ; 013D: DD E1
ret                            ; 013F: C9
; func byte_fvar_glob end
; func main begin
main:
push IX                        ; 0140: DD E5
ld IX, $0000                   ; 0142: DD 21 00 00
add IX, SP                     ; 0146: DD 39
push AF                        ; 0148: F5
push BC                        ; 0149: C5
push DE                        ; 014A: D5
push HL                        ; 014B: E5
ld HL, glob_bytes              ; 014C: 21 00 00
push HL                        ; 014F: E5
call byte_fvar_glob            ; 0150: CD 00 00
inc SP                         ; 0153: 33
inc SP                         ; 0154: 33
__zax_epilogue_1:
pop HL                         ; 0155: E1
pop DE                         ; 0156: D1
pop BC                         ; 0157: C1
pop AF                         ; 0158: F1
ld SP, IX                      ; 0159: DD F9
pop IX                         ; 015B: DD E1
ret                            ; 015D: C9
; func main end

; symbols:
; label byte_fvar_glob = $0100
; label __zax_epilogue_0 = $0138
; label main = $0140
; label __zax_epilogue_1 = $0155
; data glob_bytes = $2000
; data glob_idx_word = $2008
